import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  Index,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('email_kanban_orders')
@Index(['userId', 'columnId'])
@Index(['userId', 'emailId'])
@Index(['userId', 'columnId', 'order'])
export class EmailKanbanOrder {
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

  @Column({ type: 'float' })
  order: number;

  @CreateDateColumn({
    name: 'created_at',
  })
  createdAt: Date;

  @UpdateDateColumn({
    name: 'updated_at',
  })
  updatedAt: Date;
}
