import { AppDataSource } from '../src/database/dataSource';

describe('TypeORM Integration Test', () => {
  it('should be able to import TypeORM entities', () => {
    // Test that we can import the data source without errors
    expect(AppDataSource).toBeDefined();
    expect(typeof AppDataSource).toBe('object');
  });

  it('should have entities configured', () => {
    expect(AppDataSource.options.entities).toBeDefined();
    expect(Array.isArray(AppDataSource.options.entities)).toBe(true);
    expect(AppDataSource.options.entities.length).toBeGreaterThan(0);
  });
});