export class OperationalFrictionMapper {
  map(input: Array<{ step: string; failures: number; attempts: number }>): Array<{ step: string; friction: number }> {
    return input.map((item) => ({
      step: item.step,
      friction: item.attempts === 0 ? 0 : Number((item.failures / item.attempts).toFixed(2)),
    }));
  }
}
