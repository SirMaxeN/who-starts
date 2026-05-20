import { useCallback, useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { PREMIUM_PRODUCT_ID } from '../constants/game';
import { PremiumStorage } from '../services/PremiumStorage';
import type { Purchase } from 'expo-iap';

type ExpoIapModule = typeof import('expo-iap');

type PremiumStatus =
  | 'checking'
  | 'idle'
  | 'loading'
  | 'purchasing'
  | 'restoring'
  | 'unlocked'
  | 'pending'
  | 'unavailable'
  | 'error';

const BILLING_PRODUCT_TYPE = 'in-app';

type StoreProduct = {
  displayPrice?: string;
  id: string;
  type?: string;
};

const ENABLE_MOCK_BILLING =
  __DEV__ && require('../../app.config').expo.extra?.enableMockBilling === true;

function purchaseIncludesPremium(purchase: Purchase) {
  return purchase.productId === PREMIUM_PRODUCT_ID || purchase.ids?.includes(PREMIUM_PRODUCT_ID);
}

function isPurchased(purchase: Purchase) {
  return purchase.purchaseState === 'purchased';
}

function resolveErrorMessage(module: ExpoIapModule, error: unknown) {
  const errorCode =
    error && typeof error === 'object' && 'code' in error
      ? (error as { code?: string }).code
      : null;

  if (errorCode === module.ErrorCode.UserCancelled) {
    return null;
  }

  if (errorCode === module.ErrorCode.NetworkError) {
    return 'Network connection error. Please try again.';
  }

  if (errorCode === module.ErrorCode.BillingUnavailable) {
    return 'Google Play Billing is unavailable on this device or account.';
  }

  if (errorCode === module.ErrorCode.ItemUnavailable || errorCode === module.ErrorCode.SkuNotFound) {
    return 'Premium is not available in Google Play yet.';
  }

  if (errorCode === module.ErrorCode.ServiceDisconnected || errorCode === module.ErrorCode.ServiceError) {
    return 'Google Play Billing is temporarily unavailable. Please try again.';
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return (error as { message?: string }).message ?? 'The purchase could not be completed.';
  }

  return 'The purchase could not be completed.';
}

export function usePremiumAccess() {
  const [hasPremium, setHasPremium] = useState(false);
  const [status, setStatus] = useState<PremiumStatus>(
    Platform.OS === 'android' ? 'checking' : 'unavailable'
  );
  const [message, setMessage] = useState<string | null>(null);
  const [product, setProduct] = useState<StoreProduct | null>(null);
  const iapRef = useRef<ExpoIapModule | null>(null);
  const isReadyRef = useRef(false);
  const hasPremiumRef = useRef(false);
  const isAndroid = Platform.OS === 'android';
  const isMockBillingEnabled = isAndroid && ENABLE_MOCK_BILLING;

  useEffect(() => {
    hasPremiumRef.current = hasPremium;
  }, [hasPremium]);

  const unlock = useCallback(async () => {
    setHasPremium(true);
    setStatus('unlocked');
    setMessage('Premium is active.');
    await PremiumStorage.saveUnlocked();
  }, []);

  const completePremiumPurchase = useCallback(
    async (purchase: Purchase) => {
      const iap = iapRef.current;

      if (!iap || !purchaseIncludesPremium(purchase)) {
        return false;
      }

      if (!isPurchased(purchase)) {
        setStatus('pending');
        setMessage('Payment is pending in Google Play.');
        return false;
      }

      await unlock();
      await iap.finishTransaction({ purchase, isConsumable: false });
      return true;
    },
    [unlock]
  );

  const restoreOwnedPurchases = useCallback(async () => {
    const iap = iapRef.current;

    if (!iap || !isReadyRef.current) {
      return false;
    }

    const purchases = await iap.getAvailablePurchases();
    const premiumPurchases = purchases.filter(purchaseIncludesPremium);

    if (premiumPurchases.length === 0) {
      return false;
    }

    const restored = await Promise.all(
      premiumPurchases.map((purchase) => completePremiumPurchase(purchase))
    );

    return restored.some(Boolean);
  }, [completePremiumPurchase]);

  useEffect(() => {
    let isMounted = true;
    let removePurchaseListener: (() => void) | undefined;
    let removeErrorListener: (() => void) | undefined;

    if (!isAndroid) {
      setHasPremium(false);
      return undefined;
    }

    async function setupBilling() {
      const storedPremium = await PremiumStorage.load();

      if (!isMounted) {
        return;
      }

      if (storedPremium) {
        setHasPremium(true);
        setStatus('unlocked');
      }

      if (isMockBillingEnabled) {
        setProduct({
          displayPrice: 'DEV',
          id: PREMIUM_PRODUCT_ID,
          type: BILLING_PRODUCT_TYPE,
        });
        setStatus(storedPremium ? 'unlocked' : 'idle');
        setMessage(storedPremium ? 'Dev premium is active.' : 'Dev mock billing is active.');
        return;
      }

      try {
        const iap = await import('expo-iap');
        iapRef.current = iap;

        await iap.initConnection();
        isReadyRef.current = true;

        const purchaseSubscription = iap.purchaseUpdatedListener((purchase) => {
          completePremiumPurchase(purchase).catch((error: unknown) => {
            if (!isMounted) {
              return;
            }
            const errorMessage = resolveErrorMessage(iap, error);
            setStatus('error');
            setMessage(errorMessage ?? 'Could not finish the purchase.');
          });
        });
        const errorSubscription = iap.purchaseErrorListener((error) => {
          if (!isMounted) {
            return;
          }

          if (error.code === iap.ErrorCode.AlreadyOwned) {
            setStatus('restoring');
            restoreOwnedPurchases()
              .then((restored) => {
                if (!isMounted) {
                  return;
                }
                setStatus(restored || hasPremiumRef.current ? 'unlocked' : 'idle');
                setMessage(restored ? 'Premium restored.' : null);
              })
              .catch((restoreError: unknown) => {
                if (!isMounted) {
                  return;
                }
                const errorMessage = resolveErrorMessage(iap, restoreError);
                setStatus('error');
                setMessage(errorMessage ?? 'Could not restore the purchase.');
              });
            return;
          }

          const errorMessage = resolveErrorMessage(iap, error);
          if (errorMessage) {
            setStatus('error');
            setMessage(errorMessage);
          } else {
            setStatus(hasPremiumRef.current ? 'unlocked' : 'idle');
            setMessage(null);
          }
        });

        removePurchaseListener = () => purchaseSubscription.remove();
        removeErrorListener = () => errorSubscription.remove();

        const products = await iap.fetchProducts({
          skus: [PREMIUM_PRODUCT_ID],
          type: BILLING_PRODUCT_TYPE,
        });

        if (!isMounted) {
          return;
        }

        const premiumProduct = (products ?? []).find(
          (item) =>
            Boolean(item) && item.id === PREMIUM_PRODUCT_ID && item.type === BILLING_PRODUCT_TYPE
        ) as StoreProduct | undefined;
        setProduct(premiumProduct ?? null);
        setStatus(storedPremium ? 'unlocked' : 'idle');
        setMessage(null);

        const hasRestorablePremium = await restoreOwnedPurchases();

        if (!isMounted) {
          return;
        }

        if (!hasRestorablePremium && !storedPremium) {
          setStatus('idle');
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setStatus(storedPremium ? 'unlocked' : 'unavailable');
        setMessage(
          storedPremium
            ? null
            : 'Google Play Billing is not available in this build yet.'
        );
      }
    }

    setupBilling();

    return () => {
      isMounted = false;
      removePurchaseListener?.();
      removeErrorListener?.();
      isReadyRef.current = false;
      iapRef.current?.endConnection().catch(() => undefined);
    };
  }, [completePremiumPurchase, isAndroid, isMockBillingEnabled, restoreOwnedPurchases]);

  const buyPremium = useCallback(async () => {
    const iap = iapRef.current;

    if (isMockBillingEnabled) {
      setStatus('purchasing');
      setMessage('Completing dev mock purchase.');
      await unlock();
      setMessage('Dev mock purchase active.');
      return;
    }

    if (!isAndroid || !iap || !isReadyRef.current) {
      setStatus('unavailable');
      setMessage('Google Play Billing is available only in the Android app from Google Play.');
      return;
    }

    try {
      setStatus('purchasing');
      setMessage(null);
      await iap.requestPurchase({
        request: {
          google: {
            skus: [PREMIUM_PRODUCT_ID],
          },
        },
        type: BILLING_PRODUCT_TYPE,
      });
    } catch (error) {
      const errorMessage = resolveErrorMessage(iap, error);
      if (errorMessage) {
        setStatus('error');
        setMessage(errorMessage);
      } else {
        setStatus(hasPremiumRef.current ? 'unlocked' : 'idle');
        setMessage(null);
      }
    }
  }, [isAndroid, isMockBillingEnabled, unlock]);

  const restorePremium = useCallback(async () => {
    const iap = iapRef.current;

    if (isMockBillingEnabled) {
      setStatus('restoring');
      setMessage('Restoring dev mock purchase.');
      await unlock();
      setMessage('Dev mock purchase restored.');
      return true;
    }

    if (!isAndroid || !iap || !isReadyRef.current) {
      setStatus('unavailable');
      setMessage('Google Play Billing is available only in the Android app from Google Play.');
      return false;
    }

    try {
      setStatus('restoring');
      setMessage(null);
      const restored = await restoreOwnedPurchases();

      if (!restored) {
        setStatus(hasPremiumRef.current ? 'unlocked' : 'idle');
        setMessage('No premium purchase was found for this Google account.');
        return false;
      }

      setMessage('Premium restored.');
      return true;
    } catch (error) {
      const errorMessage = resolveErrorMessage(iap, error);
      setStatus('error');
      setMessage(errorMessage ?? 'Could not restore the purchase.');
      return false;
    }
  }, [isAndroid, isMockBillingEnabled, restoreOwnedPurchases, unlock]);

  return {
    buyPremium,
    canUseBilling: isMockBillingEnabled || (isAndroid && isReadyRef.current),
    hasPremium,
    isBusy: status === 'loading' || status === 'purchasing' || status === 'restoring',
    priceLabel: product?.displayPrice ?? null,
    product,
    restorePremium,
    status,
    message,
  };
}
