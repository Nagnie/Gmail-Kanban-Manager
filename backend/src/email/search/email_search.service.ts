import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, ILike } from 'typeorm';
import { Email } from '../entities/email.entity';
import { EmailSearchDto } from '../dto/search-email.dto';
import { OpenRouterService } from 'src/open-router/open-router.service';
import { Suggestion } from '../interfaces/suggestion.interface';
import { SearchHistory } from '../entities/email.search-history.entity';

@Injectable()
export class EmailSearchService {
  private readonly LIMIT: number = 5;

  constructor(
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
    @InjectRepository(SearchHistory)
    private searchHistoryRepository: Repository<SearchHistory>,
    private dataSource: DataSource,
    private readonly openRouterService: OpenRouterService,
  ) {}

  async searchEmails(userId: number, dto: EmailSearchDto) {
    const { query, page = 1, limit = 20 } = dto;
    const offset = (page - 1) * limit;

    const searchTerm = query.trim();

    if (!searchTerm) return [];

    // Config pg_trgm threshold
    await this.dataSource.query('SET pg_trgm.similarity_threshold = 0.1;');

    const rawQuery = `
      SELECT 
        id, 
        subject, 
        sender, 
        snippet, 
        internal_date as "internalDate", 
        is_read as "isRead",
        summary,
        -- Tính điểm Relevance Score (Sự liên quan)
        -- Ưu tiên Subject (nhân hệ số nếu muốn), sau đó đến Sender
        GREATEST(
          SIMILARITY(f_unaccent(LOWER(subject)), f_unaccent(LOWER($1))), 
          SIMILARITY(f_unaccent(LOWER(sender)), f_unaccent(LOWER($1)))
        ) as relevance_score
      FROM emails
      WHERE 
        user_id = $2
        AND (
          f_unaccent(LOWER(subject)) % f_unaccent(LOWER($1))
          OR 
          f_unaccent(LOWER(sender)) % f_unaccent(LOWER($1))
        )
      ORDER BY relevance_score DESC, internal_date DESC
      LIMIT $3 OFFSET $4
    `;

    const results = await this.dataSource.query(rawQuery, [
      searchTerm,
      userId,
      limit,
      offset,
    ]);

    return {
      data: results,
      page,
      limit,
      totalResult: results.length,
    };
  }

  async semanticSearch(userId: number, queryText: string, limit: number = 20) {
    // convert search query to vector
    const queryVector =
      await this.openRouterService.generateEmbedding(queryText);

    if (queryVector.length === 0) return [];

    const vectorString = JSON.stringify(queryVector);

    const query = `
        SELECT 
            id, subject, sender, snippet, summary, internal_date,
            -- Tính điểm tương đồng (1 - khoảng cách = độ giống)
            1 - (embedding <=> $1) as similarity
        FROM emails
        WHERE 
            user_id = $2
            AND embedding IS NOT NULL
        ORDER BY embedding <=> $1 ASC -- Sắp xếp từ khoảng cách gần nhất
        LIMIT $3;
    `;

    const results = await this.dataSource.query(query, [
      vectorString,
      userId,
      limit,
    ]);

    this.saveSearchHistory(userId, queryText).catch((err) => {
      console.error('Error saving search history:', err);
    });

    return results;
  }

  async suggestQueries(userId: number, query: string) {
    const normalizedQuery = query.trim().toLowerCase();

    const results: Suggestion[] = [
      ...(await this.suggestionFromSenders(userId, normalizedQuery)),
      ...(await this.suggestionFromSubjects(userId, normalizedQuery)),
      ...(await this.suggestionFromSearchHistory(userId, normalizedQuery)),
    ];

    return this.deduplicateResults(results);
  }

  private async suggestionFromSenders(userId: number, query: string) {
    const rows = await this.emailRepository
      .createQueryBuilder('e')
      .select('e.sender', 'value')
      .addSelect('COUNT(*)', 'frequency')
      .where('e.userId = :userId', { userId })
      .andWhere('LOWER(e.sender) LIKE :q', {
        q: `${query}%`,
      })
      .groupBy('e.sender')
      .orderBy('frequency', 'DESC')
      .limit(5)
      .getRawMany();

    return rows.map((r) => ({
      type: 'sender',
      value: r.value,
      score: this.scoreSender(r.frequency),
    }));
  }

  private scoreSender(freq: number): number {
    return Math.min(0.6 + Math.log(freq + 1) / 10, 0.95);
  }

  private async suggestionFromSubjects(userId: number, query: string) {
    const rows = await this.emailRepository.query(
      `
    SELECT keyword AS value, COUNT(*) AS frequency
    FROM (
      SELECT unnest(
        string_to_array(lower(subject), ' ')
      ) AS keyword
      FROM emails
      WHERE user_id = $1
    ) t
    WHERE keyword LIKE $2
    GROUP BY keyword
    ORDER BY frequency DESC
    LIMIT 5
  `,
      [userId, `%${query}%`],
    );

    return rows.map((r) => ({
      type: 'subject',
      value: r.value,
      score: this.scoreSubject(r.frequency),
    }));
  }

  // calculate score for subject suggestions: base +freqeuency factor
  private scoreSubject(freq: number): number {
    return Math.min(0.4 + Math.log(freq + 1) / 12, 0.85);
  }

  private async suggestionFromSearchHistory(userId: number, query: string) {
    const rows = await this.searchHistoryRepository.find({
      where: {
        userId: userId.toString(),
        query: ILike(`${query}%`),
      },
      order: {
        count: 'DESC',
        lastUsedAt: 'DESC',
      },
      take: 5,
    });

    return rows.map((r) => ({
      type: 'query',
      value: r.query,
      score: this.scoreHistory(r.count, r.lastUsedAt),
    }));
  }

  private scoreHistory(count: number, lastUsed: Date): number {
    const daysAgo = (Date.now() - lastUsed.getTime()) / (1000 * 60 * 60 * 24);

    const recencyScore = Math.max(0, 1 - daysAgo / 30);
    const freqScore = Math.log(count + 1) / 5;

    return Math.min(0.7 * freqScore + 0.3 * recencyScore, 1);
  }

  private deduplicateResults(items: Suggestion[]): Suggestion[] {
    const map = new Map<string, Suggestion>();

    for (const s of items) {
      const key = s.value.toLowerCase();
      if (!map.has(key) || map.get(key)!.score < s.score) {
        map.set(key, s);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.score - a.score)
      .slice(0, this.LIMIT);
  }

  private async saveSearchHistory(userId: number, queryText: string) {
    const record = await this.searchHistoryRepository.findOne({
      where: { userId: userId.toString(), query: queryText },
    });

    if (record) {
      record.count += 1;
      await this.searchHistoryRepository.save(record);
    } else {
      await this.searchHistoryRepository.save({
        userId: userId.toString(),
        query: queryText,
      });
    }
  }
}
