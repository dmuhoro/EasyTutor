import NetInfo from '@react-native-community/netinfo';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PaymentRequest } from '../../types/commerce';

export class OfflinePaymentSynchronizationEngine {
  private static QUEUE_KEY = 'offline_payment_queue';

  /**
   * Queues a payment request for synchronization when online.
   */
  static async queuePayment(request: PaymentRequest): Promise<void> {
    const queue = await this.getQueue();
    queue.push({
      ...request,
      timestamp: new Date().toISOString()
    });
    await AsyncStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue));
    console.log('Payment request queued for offline synchronization');
  }

  /**
   * Synchronizes queued payments when the device comes back online.
   */
  static async synchronize(): Promise<void> {
    const state = await NetInfo.fetch();
    if (!state.isConnected) return;

    const queue = await this.getQueue();
    if (queue.length === 0) return;

    console.log(`Synchronizing ${queue.length} offline payment requests...`);

    for (const request of queue) {
      try {
        // Attempt to process each queued payment
        // In a real scenario, this would call PaymentOrchestrationEngine.processPayment
        console.log(`Processing queued payment for user ${request.userId}`);
      } catch (error) {
        console.error('Failed to sync queued payment:', error);
      }
    }

    // Clear the queue after sync (or implement retry logic for individual failed syncs)
    await AsyncStorage.removeItem(this.QUEUE_KEY);
  }

  private static async getQueue(): Promise<any[]> {
    const data = await AsyncStorage.getItem(this.QUEUE_KEY);
    return data ? JSON.parse(data) : [];
  }
}
