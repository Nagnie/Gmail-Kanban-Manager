import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Index('idx_emails_user_date', ['userId', 'internalDate'], { unique: false })
@Entity('emails')
export class Email {
  @PrimaryColumn('varchar', { length: 255 })
  id: string;

  @Column('bigint', { name: 'user_id', nullable: false })
  userId: number;

  @Column('varchar', { name: 'thread_id', length: 255, nullable: true })
  threadId: string | null;

  @Column('text', { nullable: true })
  subject: string | null;

  @Column('text', { nullable: true })
  sender: string | null;

  @Column('text', { nullable: true })
  snippet: string | null;

  @Column('bigint', { name: 'internal_date' })
  internalDate: string; // Sử dụng string để tránh tràn số (JavaScript max safe integer)

  @Column('boolean', { name: 'is_read', default: false })
  isRead: boolean;

  @Column('text', { default: '' })
  summary: string;

  @Column({
    type: 'vector',
    nullable: true,
  })
  embedding: number[] | null;

  @CreateDateColumn({ name: 'created_at', type: 'timestamp' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamp' })
  updatedAt: Date;
}
