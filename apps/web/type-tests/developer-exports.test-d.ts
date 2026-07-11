// SPDX-License-Identifier: MIT
import {
  createGameBootstrapControllerV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
} from "@project-tavern/web";
import { DevelopmentPanel } from "@project-tavern/web/developer";

export { createGameBootstrapControllerV1, createWebHostV1, Loader, mountGameApplicationV1, DevelopmentPanel };
// @ts-expect-error the Player-safe Web root never re-exports Developer UI
export { DevelopmentPanel as ForbiddenDevelopmentPanel } from "@project-tavern/web";
