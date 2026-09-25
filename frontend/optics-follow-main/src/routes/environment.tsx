import { createFileRoute } from "@tanstack/react-router";
import { ApplyConfigBar } from "@/components/controls/ApplyConfigBar";
import { KeyValue, PageHeader, Panel } from "@/components/layout/Panel";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useAppState } from "@/hooks/appState";
import { DISTURBANCE_DEFS } from "@/utils/defaultConfig";

export const Route = createFileRoute("/environment")({
  head: () => ({
    meta: [
      { title: "Environment & Disturbances — FSOC Virtual Camera" },
      {
        name: "description",
        content:
          "Enable noise, blur, lighting, weather and platform-motion disturbances to stress-test FSOC tracking.",
      },
      { property: "og:title", content: "Environment & Disturbances — FSOC Virtual Camera" },
      {
        property: "og:description",
        content: "Noise, blur, weather and platform motion disturbance controls.",
      },
    ],
  }),
  component: EnvironmentPage,
});

function EnvironmentPage() {
  const { configState } = useAppState();
  const { config, update } = configState;
  const active = DISTURBANCE_DEFS.filter((d) => config.disturbances[d.key]?.enabled);

  const setAll = (enabled: boolean) =>
    update((p) => ({
      ...p,
      disturbances: DISTURBANCE_DEFS.reduce(
        (acc, d) => ({ ...acc, [d.key]: { ...p.disturbances[d.key], enabled } }),
        { ...p.disturbances },
      ),
    }));

  return (
    <>
      <PageHeader
        title="Environment & Disturbances"
        description="Real-world impairments applied to the simulated camera feed by the backend."
        actions={
          <>
            <Button variant="outline" size="sm" onClick={() => setAll(true)}>
              Enable all
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setAll(false)}>
              Disable all
            </Button>
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel
          title="Disturbance model"
          subtitle="Each impairment is toggled and scaled independently"
        >
          <div className="grid gap-3 sm:grid-cols-2">
            {DISTURBANCE_DEFS.map((d) => {
              const setting = config.disturbances[d.key];
              return (
                <div
                  key={d.key}
                  className="rounded-md border border-border bg-secondary/30 px-3.5 py-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{d.label}</div>
                      <p className="text-[11px] text-muted-foreground">{d.description}</p>
                    </div>
                    <Switch
                      checked={setting.enabled}
                      onCheckedChange={(checked) =>
                        update((p) => ({
                          ...p,
                          disturbances: {
                            ...p.disturbances,
                            [d.key]: { ...p.disturbances[d.key], enabled: checked },
                          },
                        }))
                      }
                      aria-label={`Toggle ${d.label}`}
                    />
                  </div>
                  {d.hasIntensity && (
                    <div className="mt-3 flex items-center gap-3">
                      <Slider
                        value={[setting.intensity]}
                        min={0}
                        max={1}
                        step={0.05}
                        disabled={!setting.enabled}
                        onValueChange={(v) =>
                          update((p) => ({
                            ...p,
                            disturbances: {
                              ...p.disturbances,
                              [d.key]: { ...p.disturbances[d.key], intensity: v[0] },
                            },
                          }))
                        }
                        aria-label={`${d.label} intensity`}
                      />
                      <span className="numeric text-xs w-10 text-right text-muted-foreground">
                        {setting.intensity.toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel
          title="Active disturbances"
          subtitle={`${active.length} of ${DISTURBANCE_DEFS.length} enabled`}
        >
          {active.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Clean conditions — no impairments enabled.
            </p>
          ) : (
            active.map((d) => (
              <KeyValue
                key={d.key}
                label={d.label}
                value={config.disturbances[d.key].intensity.toFixed(2)}
              />
            ))
          )}
        </Panel>
      </div>

      <ApplyConfigBar />
    </>
  );
}
