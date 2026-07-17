// SPDX-License-Identifier: MIT
import type {
  ReadonlyViewSourceV1,
  RuntimeCapabilitiesV1,
  RuntimeCapabilityIdV1,
  RuntimeCapabilityPortV1,
} from "@sillymaker/base";
import { useCallback, useId, useState, useSyncExternalStore } from "react";
import type { ChangeEvent, ReactElement } from "react";

export interface CapabilityPanelPropsV1 {
  readonly persistedCapabilities: RuntimeCapabilityPortV1;
  readonly effectiveCapabilities: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>;
  readonly sessionRequested: readonly RuntimeCapabilityIdV1[];
}

interface CapabilityDescriptorV1 {
  readonly id: RuntimeCapabilityIdV1;
  readonly field: keyof RuntimeCapabilitiesV1;
  readonly label: string;
}

const capabilityDescriptorsV1 = Object.freeze([
  Object.freeze({ id: "debug_tools", field: "debugTools", label: "调试工具" }),
  Object.freeze({ id: "cheats", field: "cheats", label: "作弊功能" }),
  Object.freeze({
    id: "automation_bridge",
    field: "automationBridge",
    label: "自动化桥接",
  }),
] as const satisfies readonly CapabilityDescriptorV1[]);

function useCapabilityStateV1(
  source: ReadonlyViewSourceV1<RuntimeCapabilitiesV1>,
): RuntimeCapabilitiesV1 {
  const subscribe = useCallback((listener: () => void) => source.subscribe(listener), [source]);
  const getSnapshot = useCallback(() => source.getCurrent(), [source]);
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function CapabilityPanelV1(props: CapabilityPanelPropsV1): ReactElement {
  const persisted = useCapabilityStateV1(props.persistedCapabilities.state);
  const effective = useCapabilityStateV1(props.effectiveCapabilities);
  const [cheatsConfirmed, setCheatsConfirmed] = useState(false);
  const [pendingCapability, setPendingCapability] = useState<RuntimeCapabilityIdV1 | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const descriptionPrefix = useId();

  async function setCapability(
    descriptor: CapabilityDescriptorV1,
    enabled: boolean,
  ): Promise<void> {
    if (props.sessionRequested.includes(descriptor.id)) return;
    if (descriptor.id === "cheats" && enabled && !cheatsConfirmed) return;
    setPendingCapability(descriptor.id);
    setFeedback(null);
    try {
      const result = await props.persistedCapabilities.setEnabled(descriptor.id, enabled);
      if (result.kind === "rejected") {
        setFeedback(
          `${descriptor.label}${result.code === "conflict" ? "设置存在冲突" : "当前不可用"}`,
        );
      } else {
        setFeedback(`${descriptor.label}已${enabled ? "启用" : "关闭"}`);
        if (descriptor.id === "cheats") setCheatsConfirmed(false);
      }
    } catch {
      setFeedback(`${descriptor.label}设置失败`);
    } finally {
      setPendingCapability(null);
    }
  }

  return (
    <section aria-label="运行时能力" onClick={(event) => event.stopPropagation()}>
      <h3>运行时能力</h3>
      <div>
        {capabilityDescriptorsV1.map((descriptor) => {
          const sessionOverride = props.sessionRequested.includes(descriptor.id);
          const enablingUnconfirmedCheats =
            descriptor.id === "cheats" && !persisted.cheats && !cheatsConfirmed;
          const disabled =
            sessionOverride ||
            pendingCapability !== null ||
            (enablingUnconfirmedCheats && !effective.cheats);
          const descriptionId = `${descriptionPrefix}-${descriptor.id}`;
          return (
            <div key={descriptor.id}>
              <label>
                <input
                  aria-describedby={descriptionId}
                  checked={effective[descriptor.field]}
                  disabled={disabled}
                  onChange={(event: ChangeEvent<HTMLInputElement>) =>
                    void setCapability(descriptor, event.currentTarget.checked)
                  }
                  role="switch"
                  type="checkbox"
                />
                {descriptor.label}
              </label>
              <p id={descriptionId}>
                {sessionOverride
                  ? `${descriptor.label}由本次会话请求启用`
                  : `已保存：${persisted[descriptor.field] ? "开启" : "关闭"}；当前有效：${effective[descriptor.field] ? "开启" : "关闭"}`}
              </p>
            </div>
          );
        })}
      </div>

      {!props.sessionRequested.includes("cheats") && !persisted.cheats ? (
        <label>
          <input
            checked={cheatsConfirmed}
            onChange={(event) => setCheatsConfirmed(event.currentTarget.checked)}
            type="checkbox"
          />
          我确认启用作弊功能
        </label>
      ) : null}
      <div aria-live="polite">{feedback === null ? null : <p>{feedback}</p>}</div>
    </section>
  );
}
