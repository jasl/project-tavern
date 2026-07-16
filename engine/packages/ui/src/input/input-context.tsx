// SPDX-License-Identifier: MIT
import { createContext, useContext } from "react";
import type { ReactElement, ReactNode } from "react";
import type { InputRouterV1 } from "./contracts.js";

const InputRouterContextV1 = createContext<InputRouterV1 | null>(null);

export interface InputContextProviderPropsV1 {
  readonly router: InputRouterV1;
  readonly children: ReactNode;
}

export function InputContextProviderV1(props: InputContextProviderPropsV1): ReactElement {
  return (
    <InputRouterContextV1.Provider value={props.router}>
      {props.children}
    </InputRouterContextV1.Provider>
  );
}

export function useInputRouterV1(): InputRouterV1 {
  const router = useContext(InputRouterContextV1);
  if (router === null) {
    throw new Error("ui.input_provider_missing");
  }
  return router;
}
