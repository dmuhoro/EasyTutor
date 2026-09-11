export class CrossPlatformDistributionEngine {
  distribute(contentId: string, platforms: string[] = ['email', 'linkedin', 'whatsapp']): {
    distributed: boolean;
    contentId: string;
    platforms: string[];
  } {
    return {
      distributed: platforms.length > 0,
      contentId,
      platforms,
    };
  }
}
