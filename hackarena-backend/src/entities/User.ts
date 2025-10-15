import { Entity, PrimaryColumn, Column, CreateDateColumn, OneToMany } from 'typeorm';
import { Game } from './Game.js';

@Entity('users')
export class User {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('text', { unique: true })
  email: string;

  @Column('text', { nullable: true })
  password: string;

  @Column('text')
  name: string;

  @Column('text', { nullable: true })
  google_id: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Game, game => game.organizer, { lazy: true })
  games: Promise<Game[]>;
}