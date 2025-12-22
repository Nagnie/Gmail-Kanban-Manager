import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_priorities')
@Index(['userId', 'emailId'])
@Index(['userId', 'columnId', 'isPinned'])
export class EmailPriority {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'user_id',
    type: 'int',
  })
  userId: number;

  @Column({
    name: 'email_id',
    type: 'varchar',
    length: 255,
  })
  emailId: string;

  @Column({
    name: 'column_id',
    type: 'int',
  })
  columnId: number;

  @Column({ default: false, name: 'is_pinned' })
  isPinned: boolean;

  @Column({ type: 'float', nullable: true, name: 'pinned_order' })
  pinnedOrder: number;

  @Column({ type: 'int', default: 0, name: 'priority_level' })
  priorityLevel: number; // 0 = normal, 1 = high, 2 = urgent

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
