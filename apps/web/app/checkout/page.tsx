'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Button, Card, CardBody, CardHeader,
  Input, Divider, Spinner,
} from '@heroui/react';
import { useAuth } from '../../lib/auth-context';
import { checkout } from '../../lib/api';
import { CheckoutItem, CheckoutResult } from '../../lib/types';
import { checkoutFormSchema } from './schemas';

const emptyItem = (): CheckoutItem => ({ name: '', unit_price: 0, quantity: 1 });

type ItemErrors = { name?: string; unit_price?: string; quantity?: string };

export default function CheckoutPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<CheckoutItem[]>([emptyItem()]);
  const [itemErrors, setItemErrors] = useState<ItemErrors[]>([{}]);
  const [result, setResult] = useState<CheckoutResult | null>(null);
  const [apiError, setApiError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token) router.push('/login');
  }, [token, router]);

  const runningSubtotal = items.reduce(
    (s, i) => s + (i.unit_price || 0) * (i.quantity || 0),
    0,
  );

  function updateItem(idx: number, field: keyof CheckoutItem, raw: string) {
    setItems(prev =>
      prev.map((it, i) =>
        i === idx
          ? { ...it, [field]: field === 'name' ? raw : Number(raw) }
          : it,
      ),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setApiError('');
    setResult(null);

    const result = checkoutFormSchema.safeParse({ items });
    if (!result.success) {
      const errs = result.error.flatten().fieldErrors;
      const perItem: ItemErrors[] = items.map((_, idx) => {
        const prefix = `items[${idx}]`;
        const fieldErr: ItemErrors = {};
        for (const [key, msgs] of Object.entries(errs)) {
          if (key.startsWith(prefix)) {
            const sub = key.replace(`${prefix}.`, '') as keyof CheckoutItem;
            (fieldErr as Record<string, string>)[sub] = (msgs as string[])[0];
          }
        }
        return fieldErr;
      });
      // also check per-item errors from nested flatten
      const nestedErrors = result.error.issues.reduce<ItemErrors[]>((acc, issue) => {
        const [, idxStr, field] = issue.path as [string, number, string];
        if (idxStr !== undefined && field !== undefined) {
          acc[idxStr] = acc[idxStr] ?? {};
          (acc[idxStr] as Record<string, string>)[field] = issue.message;
        }
        return acc;
      }, items.map(() => ({})));
      setItemErrors(nestedErrors);
      return;
    }
    setItemErrors(items.map(() => ({})));
    setLoading(true);
    try {
      const res = await checkout(token!, result.data.items);
      setResult(res);
    } catch (err: unknown) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  function addItem() {
    setItems(prev => [...prev, emptyItem()]);
    setItemErrors(prev => [...prev, {}]);
  }

  function removeItem(idx: number) {
    setItems(prev => prev.filter((_, i) => i !== idx));
    setItemErrors(prev => prev.filter((_, i) => i !== idx));
  }

  if (!token) return null;

  return (
    <main className="min-h-screen bg-default-100 py-10 px-4">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">Checkout</h1>
          <Button
            variant="light"
            size="sm"
            color="default"
            onPress={() => { logout(); router.push('/login'); }}
          >
            Sign out
          </Button>
        </div>

        <Card>
          <CardBody className="gap-4 p-6">
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {items.map((item, idx) => (
                <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-5">
                    <Input
                      label="Item name"
                      size="sm"
                      value={item.name}
                      onValueChange={v => updateItem(idx, 'name', v)}
                      isInvalid={!!itemErrors[idx]?.name}
                      errorMessage={itemErrors[idx]?.name}
                      isRequired
                    />
                  </div>
                  <div className="col-span-3">
                    <Input
                      label="Price"
                      size="sm"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={item.unit_price ? String(item.unit_price) : ''}
                      onValueChange={v => updateItem(idx, 'unit_price', v)}
                      isInvalid={!!itemErrors[idx]?.unit_price}
                      errorMessage={itemErrors[idx]?.unit_price}
                      isRequired
                    />
                  </div>
                  <div className="col-span-2">
                    <Input
                      label="Qty"
                      size="sm"
                      type="number"
                      min="1"
                      step="1"
                      value={String(item.quantity)}
                      onValueChange={v => updateItem(idx, 'quantity', v)}
                      isInvalid={!!itemErrors[idx]?.quantity}
                      errorMessage={itemErrors[idx]?.quantity}
                      isRequired
                    />
                  </div>
                  <div className="col-span-2 flex items-center pt-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="light"
                      color="danger"
                      isDisabled={items.length === 1}
                      onPress={() => removeItem(idx)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}

              <div className="flex justify-between items-center pt-1">
                <Button type="button" variant="light" color="primary" size="sm" onPress={addItem}>
                  + Add item
                </Button>
                <span className="text-sm text-default-500">
                  Running subtotal: <strong>${runningSubtotal.toFixed(2)}</strong>
                </span>
              </div>

              {apiError && <p className="text-danger text-sm">{apiError}</p>}

              <Button
                type="submit"
                color="primary"
                fullWidth
                isLoading={loading}
                isDisabled={loading}
              >
                {loading ? <Spinner size="sm" color="white" /> : 'Calculate checkout'}
              </Button>
            </form>
          </CardBody>
        </Card>

        {result && (
          <Card>
            <CardHeader className="px-6 pt-5 pb-0">
              <h2 className="font-semibold text-lg">Result</h2>
            </CardHeader>
            <CardBody className="px-6 pb-6 gap-2">
              {(
                [
                  ['Subtotal', result.subtotal],
                  ['Taxes (13%)', result.taxes],
                  ['Discount (10%)', result.discount],
                ] as [string, number][]
              ).map(([label, val]) => (
                <div key={label} className="flex justify-between text-sm text-default-600">
                  <span>{label}</span>
                  <span>${val.toFixed(2)}</span>
                </div>
              ))}
              <Divider className="my-2" />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>${result.total.toFixed(2)}</span>
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </main>
  );
}
