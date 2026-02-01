// src/index.ts
export { FeatureFlagClient } from './FeatureFlagClient';
export * from './types';

// Factory function for easy initialization
export function createFeatureFlagClient(config: import('./types').FeatureFlagClientConfig) {
  return new FeatureFlagClient(config);
}

// React Hook for React applications
export function createFeatureFlagHook(client: FeatureFlagClient) {
  return function useFeatureFlag(featureKey: string, context?: import('./types').Partial<FlagEvaluationContext>) {
    const [result, setResult] = useState<import('./types').FlagEvaluationResult | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      let mounted = true;

      const evaluate = async () => {
        try {
          setLoading(true);
          const evaluationResult = await client.evaluateFlag(featureKey, context);
          if (mounted) {
            setResult(evaluationResult);
            setError(null);
          }
        } catch (err) {
          if (mounted) {
            setError(err as Error);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      };

      evaluate();

      // Listen for flag updates
      const handleUpdate = () => {
        evaluate();
      };

      client.onFlagUpdate(featureKey, handleUpdate);
      client.onFlagUpdate('*', handleUpdate);

      return () => {
        mounted = false;
        client.offFlagUpdate(featureKey, handleUpdate);
        client.offFlagUpdate('*', handleUpdate);
      };
    }, [featureKey, JSON.stringify(context)]);

    return {
      enabled: result?.enabled ?? false,
      variant: result?.variantKey,
      payload: result?.payload,
      loading,
      error,
      result
    };
  };
}