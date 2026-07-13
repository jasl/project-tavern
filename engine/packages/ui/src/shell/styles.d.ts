// SPDX-License-Identifier: MIT
declare module "*.module.css" {
  const classes: Readonly<Record<string, string>>;
  export default classes;
}
