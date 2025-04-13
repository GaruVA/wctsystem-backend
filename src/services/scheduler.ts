import notificationService from './notificationService';

/**
 * Scheduler class to handle periodic tasks
 */
class Scheduler {
  private alertCheckInterval: NodeJS.Timeout | null = null;
  
  /**
   * Start the scheduler jobs
   */
  start(): void {
    this.startAlertChecker();
    console.log('Scheduler started successfully');
  }
  
  /**
   * Stop all scheduler jobs
   */
  stop(): void {
    if (this.alertCheckInterval) {
      clearInterval(this.alertCheckInterval);
      this.alertCheckInterval = null;
    }
    console.log('Scheduler stopped');
  }
  
  /**
   * Start the periodic alert checks
   */
  private startAlertChecker(): void {
    // Run once immediately on startup
    this.runAlertChecks();
    
    // Then schedule to run every 15 minutes
    // In a production environment, this could be adjusted based on requirements
    const FIFTEEN_MINUTES = 15 * 60 * 1000;
    this.alertCheckInterval = setInterval(() => {
      this.runAlertChecks();
    }, FIFTEEN_MINUTES);
  }
  
  /**
   * Run all alert checks via the notification service
   */
  private async runAlertChecks(): Promise<void> {
    try {
      console.log('Running scheduled alert checks...');
      await notificationService.runAllChecks();
      console.log('Alert checks completed');
    } catch (error) {
      console.error('Error during scheduled alert checks:', error);
    }
  }
}

export default new Scheduler();