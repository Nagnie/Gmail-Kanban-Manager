import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Email } from '../entities/email.entity';
import { EmailSearchDto } from '../dto/search-email.dto';
import { OpenRouterService } from 'src/open-router/open-router.service';

@Injectable()
export class EmailSearchService {
  constructor(
    @InjectRepository(Email)
    private emailRepository: Repository<Email>,
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

    return results;
  }
}
