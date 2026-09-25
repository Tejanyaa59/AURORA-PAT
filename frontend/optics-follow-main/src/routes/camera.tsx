import { createFileRoute } from "@tanstack/react-router";
import { ApplyConfigBar } from "@/components/controls/ApplyConfigBar";
import { NumberField } from "@/components/controls/NumberField";
import { KeyValue, PageHeader, Panel } from "@/components/layout/Panel";
import { PanTiltIndicator } from "@/components/tracking/PanTiltIndicator";
import { useAppState } from "@/hooks/appState";
import { fmt } from "@/utils/format";

export const Route = createFileRoute("/camera")({
  head: () => ({
    meta: [
      { title: "Camera & Pan-Tilt — FSOC Virtual Camera" },
      {
        name: "description",
        content:
          "Configure virtual camera resolution, field of view, pan/tilt speed limits and mechanical jitter.",
      },
      { property: "og:title", content: "Camera & Pan-Tilt — FSOC Virtual Camera" },
      {
        property: "og:description",
        content: "Resolution, field of view, slew rate limits and jitter settings.",
      },
    ],
  }),
  component: CameraPage,
});

function CameraPage() {
  const { configState, stream } = useAppState();
  const { config, update } = configState;
  const c = config.camera;
  const setCam = (patch: Partial<typeof c>) =>
    update((p) => ({ ...p, camera: { ...p.camera, ...patch } }));

  return (
    <>
      <PageHeader
        title="Camera / Pan-Tilt"
        description="Virtual sensor geometry and gimbal limits used by the backend camera model."
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="flex flex-col gap-4 min-w-0">
          <Panel title="Sensor" subtitle="Output frame size of the virtual camera">
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Frame width"
                unit="px"
                min={160}
                max={1920}
                step={10}
                value={c.width}
                onChange={(v) => setCam({ width: v })}
              />
              <NumberField
                label="Frame height"
                unit="px"
                min={120}
                max={1080}
                step={10}
                value={c.height}
                onChange={(v) => setCam({ height: v })}
              />
            </div>
          </Panel>

          <Panel title="Field of view">
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Horizontal FOV"
                unit="deg"
                min={5}
                max={120}
                step={0.5}
                value={c.horizontal_fov}
                onChange={(v) => setCam({ horizontal_fov: v })}
              />
              <NumberField
                label="Vertical FOV"
                unit="deg"
                min={5}
                max={120}
                step={0.5}
                value={c.vertical_fov}
                onChange={(v) => setCam({ vertical_fov: v })}
              />
            </div>
          </Panel>

          <Panel title="Pan-tilt limits and jitter">
            <div className="grid gap-5 sm:grid-cols-2">
              <NumberField
                label="Max pan speed"
                unit="°/s"
                min={1}
                max={360}
                step={1}
                value={c.max_pan_speed}
                onChange={(v) => setCam({ max_pan_speed: v })}
              />
              <NumberField
                label="Max tilt speed"
                unit="°/s"
                min={1}
                max={360}
                step={1}
                value={c.max_tilt_speed}
                onChange={(v) => setCam({ max_tilt_speed: v })}
              />
              <NumberField
                label="Jitter X"
                unit="px"
                min={0}
                max={20}
                step={0.1}
                value={c.jitter_x}
                onChange={(v) => setCam({ jitter_x: v })}
              />
              <NumberField
                label="Jitter Y"
                unit="px"
                min={0}
                max={20}
                step={0.1}
                value={c.jitter_y}
                onChange={(v) => setCam({ jitter_y: v })}
              />
            </div>
          </Panel>
        </div>

        <div className="flex flex-col gap-4 min-w-0">
          <PanTiltIndicator camera={stream.latest?.camera} />
          <Panel
            title="Derived geometry"
            subtitle="Display-only estimates from the draft configuration"
          >
            <KeyValue label="Aspect ratio" value={fmt(c.width / Math.max(1, c.height), 3)} />
            <KeyValue
              label="Deg per px (H)"
              value={fmt(c.horizontal_fov / Math.max(1, c.width), 4)}
            />
            <KeyValue
              label="Deg per px (V)"
              value={fmt(c.vertical_fov / Math.max(1, c.height), 4)}
            />
            <KeyValue label="Pan slew limit" value={`${c.max_pan_speed} °/s`} />
            <KeyValue label="Tilt slew limit" value={`${c.max_tilt_speed} °/s`} />
          </Panel>
        </div>
      </div>

      <ApplyConfigBar />
    </>
  );
}
