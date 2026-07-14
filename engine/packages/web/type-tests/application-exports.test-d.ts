// SPDX-License-Identifier: MIT
import {
  createGameBootstrapControllerV1,
  createGameRuntimeV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
} from "@sillymaker/web";

export {
  createGameBootstrapControllerV1,
  createGameRuntimeV1,
  createWebHostV1,
  Loader,
  mountGameApplicationV1,
};
// @ts-expect-error the application root does not export removed Developer UI
export { DevelopmentPanel as ForbiddenDevelopmentPanel } from "@sillymaker/web";
// @ts-expect-error the single Artifact surface has no Developer subpath
export { DevelopmentPanel as ForbiddenDeveloperSubpath } from "@sillymaker/web/developer";
