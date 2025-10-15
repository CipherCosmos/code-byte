import { Entity, PrimaryColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { SupportedLanguage } from './SupportedLanguage.ts';

@Entity('code_templates')
export class CodeTemplate {
  @PrimaryColumn('uuid', { default: () => 'gen_random_uuid()' })
  id: string;

  @Column('uuid')
  language_id: string;

  @ManyToOne(() => SupportedLanguage, language => language.templates, { lazy: true })
  @JoinColumn({ name: 'language_id' })
  language: Promise<SupportedLanguage>;

  @Column('text')
  template_name: string;

  @Column('text')
  template_code: string;

  @Column('text', { nullable: true })
  description: string;

  @Column('boolean', { default: false })
  is_default: boolean;

  @CreateDateColumn()
  created_at: Date;
}