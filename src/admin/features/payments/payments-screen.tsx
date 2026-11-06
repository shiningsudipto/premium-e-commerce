"use client";

import { InfoIcon } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { errorMessage } from "../../store/api-errors";
import {
  useGetV1AdminChannelsQuery,
  useGetV1AdminMarketsQuery,
  useGetV1AdminSettingsQuery,
} from "../../store/api.generated";
import { PageHeader } from "../../components/console-shell";
import { SettingCard } from "../settings/settings-screen";

// The API has no payment-provider endpoints yet: the only provider is "manual" (cash on delivery
// or bank transfer), configured through the settings registry under payments.manual.*. This
// screen shows those settings; online providers get their own configuration once the API has it.
const PROVIDERS = [
  {
    key: "manual",
    name: "Manual (cash on delivery / bank transfer)",
    description:
      "Nothing is charged online. Staff mark the payment as received on the order, and record refunds with a reference.",
    settingsPrefix: "payments.manual.",
  },
];

export function PaymentsScreen() {
  const settings = useGetV1AdminSettingsQuery({});
  const markets = useGetV1AdminMarketsQuery({});
  const channels = useGetV1AdminChannelsQuery({});

  return (
    <>
      <PageHeader
        title="Payments"
        description="Payment methods offered at checkout. Manual payment is the only provider the API supports today; it's configured with the settings below, per market where needed."
      />
      <Alert className="mb-6">
        <InfoIcon />
        <AlertDescription>
          Online providers (cards, mobile wallets) will appear here when the API adds them. Their keys will be stored as
          secrets and always shown masked.
        </AlertDescription>
      </Alert>
      {settings.error ? (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage(settings.error)}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-8">
        {PROVIDERS.map((provider) => {
          const own = settings.data?.filter((s) => s.key.startsWith(provider.settingsPrefix)) ?? [];
          return (
            <section key={provider.key} aria-labelledby={`provider-${provider.key}`} className="space-y-4">
              <div className="space-y-1">
                <h2 id={`provider-${provider.key}`} className="flex items-center gap-2 font-medium">
                  {provider.name}
                  <Badge variant="outline" className="font-mono">
                    {provider.key}
                  </Badge>
                </h2>
                <p className="max-w-2xl text-sm text-muted-foreground">{provider.description}</p>
              </div>
              {settings.isLoading && Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-40 w-full" />)}
              {!settings.isLoading && own.length === 0 && !settings.error && (
                <p className="text-sm text-muted-foreground">No settings for this provider.</p>
              )}
              {own.map((setting) => (
                <SettingCard
                  key={setting.key}
                  setting={setting}
                  markets={markets.data ?? []}
                  channels={channels.data ?? []}
                />
              ))}
            </section>
          );
        })}
      </div>
    </>
  );
}
