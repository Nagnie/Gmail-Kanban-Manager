import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

@Entity('kanban_column_configs')
@Index(['userId', 'order'])
@Index(['userId', 'isActive'])
export class KanbanColumnConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: 'int',
    name: 'user_id',
  })
  userId: number;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 100, name: 'gmail_label' })
  gmailLabel: string; // Gmail label ID (e.g., "INBOX", "Label_123")

  @Column({ length: 100, nullable: true, name: 'gmail_label_name' })
  gmailLabelName: string; // Gmail label name for display (e.g., "Inbox", "My Label")

  @Column({ type: 'int', default: 0 })
  order: number; // Display order

  @Column({ default: true, name: 'is_active' })
  isActive: boolean; // Soft delete

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
