describe('TypeScript Test', () => {
  it('should handle TypeScript imports', () => {
    // Simple test to verify TypeScript compilation
    const testValue: string = 'Hello TypeScript';
    expect(testValue).toBe('Hello TypeScript');
  });

  it('should handle ES modules', () => {
    const testArray: number[] = [1, 2, 3];
    expect(testArray.length).toBe(3);
  });
});