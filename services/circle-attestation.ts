/**
 * Circle Attestation Service - Get cross-chain signatures
 * Pure frontend implementation, directly calls Circle public API
 */

// Circle API configuration
const CIRCLE_API_CONFIG = {
  baseUrl: 'https://iris-api-sandbox.circle.com', // Testnet
  // baseUrl: 'https://iris-api.circle.com', // Mainnet
  pollInterval: 2000, // Poll every 2 seconds
  maxWaitTime: 5 * 60 * 1000, // Max wait 5 minutes
  maxRetries: 150, // Max 150 retries
};

// Attestation data interface
export interface AttestationData {
  status: 'pending' | 'complete' | 'failed';
  messageHash: string;
  messageBytes: string;
  attestation: string;
}

/**
 * Circle Attestation Service
 */
export class CircleAttestationService {
  /**
   * Get attestation signature
   * @param messageHash Message hash
   * @param onProgress Progress callback
   */
  async getAttestation(
    messageHash: string,
    onProgress?: (step: string, data?: any) => void
  ): Promise<AttestationData> {
    try {
      onProgress?.('🔍 Waiting for attestation');

      const startTime = Date.now();
      let retries = 0;

      while (retries < CIRCLE_API_CONFIG.maxRetries) {
        try {
          // Check timeout
          if (Date.now() - startTime > CIRCLE_API_CONFIG.maxWaitTime) {
            throw new Error('Attestation timeout (exceeded 5 minutes)');
          }

          const elapsed = Math.round((Date.now() - startTime) / 1000);
          onProgress?.(`🔍 Querying (${elapsed}s)`);

          const response = await fetch(
            `${CIRCLE_API_CONFIG.baseUrl}/v1/attestations/${messageHash}`,
            {
              method: 'GET',
              headers: {
                Accept: 'application/json',
              },
            }
          );

          if (!response.ok) {
            if (response.status === 404) {
              // Message still processing
              await this.sleep(CIRCLE_API_CONFIG.pollInterval);
              retries++;
              continue;
            } else {
              throw new Error(`Circle API error: ${response.status} ${response.statusText}`);
            }
          }

          const data = (await response.json()) as any;

          if (data.status === 'complete' && data.attestation) {
            onProgress?.('✅ Attestation received');
            return {
              status: 'complete',
              messageHash: messageHash,
              messageBytes: data.message || '',
              attestation: data.attestation,
            };
          } else if (data.status === 'failed') {
            throw new Error('Circle signature failed');
          } else {
            await this.sleep(CIRCLE_API_CONFIG.pollInterval);
            retries++;
          }
        } catch (error: any) {
          if (retries === CIRCLE_API_CONFIG.maxRetries - 1) {
            throw error;
          }
          console.log('Request failed, retrying...', error);
          await this.sleep(CIRCLE_API_CONFIG.pollInterval);
          retries++;
        }
      }

      throw new Error('Exceeded maximum retry attempts');
    } catch (error: any) {
      console.error('Failed to get attestation:', error);
      throw new Error(error.message || 'Failed to get Circle signature');
    }
  }

  /**
   * Check attestation status (without waiting)
   */
  async checkAttestationStatus(messageHash: string): Promise<AttestationData> {
    try {
      const response = await fetch(
        `${CIRCLE_API_CONFIG.baseUrl}/v1/attestations/${messageHash}`,
        {
          method: 'GET',
          headers: {
            Accept: 'application/json',
          },
        }
      );

      if (response.status === 404) {
        return {
          status: 'pending',
          messageHash,
          messageBytes: '',
          attestation: '',
        };
      }

      if (!response.ok) {
        throw new Error(`Circle API error: ${response.status}`);
      }

      const data = (await response.json()) as any;
      return {
        status: data.status,
        messageHash,
        messageBytes: data.message || '',
        attestation: data.attestation || '',
      };
    } catch (error) {
      console.error('Failed to check attestation status:', error);
      throw error;
    }
  }

  /**
   * Validate attestation data
   */
  validateAttestationData(data: AttestationData): boolean {
    return (
      data.status === 'complete' &&
      data.messageHash.length === 66 &&
      data.messageBytes.length > 0 &&
      data.attestation.length > 0
    );
  }

  /**
   * Get estimated wait time
   */
  getEstimatedWaitTime(): string {
    return 'Usually 1-3 minutes, max wait 5 minutes';
  }

  /**
   * Sleep function
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// Export singleton
export const circleAttestationService = new CircleAttestationService();

