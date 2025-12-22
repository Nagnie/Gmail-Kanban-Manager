import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../user/entities/user.entity';

@Entity('email_snoozes')
@Index(['userId', 'isRestored'])
@Index(['snoozeUntil', 'isRestored'])
export class EmailSnooze {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'user_id',
    type: 'int',
  })
  userId: number;

  @ManyToOne(() => User)
  user: User;

  @Column({
    name: 'email_id',
    type: 'varchar',
    length: 255,
  })
  emailId: string;

  @Column({
    name: 'thread_id',
    type: 'varchar',
    length: 255,
  })
  threadId: string;

  @Column({
    name: 'original_column',
    type: 'int',
  })
  originalColumn: number;

  @Column({ type: 'timestamp', name: 'snooze_until' })
  snoozeUntil: Date;

  @Column({ default: false, name: 'is_restored' })
  isRestored: boolean;

  @Column({ type: 'timestamp', nullable: true, name: 'restored_at' })
  restoredAt: Date;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
