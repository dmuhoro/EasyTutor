export class MobileNotificationOrchestrator {
  notify(topic: string, priority: 'low' | 'normal' | 'high'): { dispatched: boolean; channel: string } {
    return {
      dispatched: true,
      channel: priority === 'high' ? 'push+sms' : 'push',
    };
  }
}
