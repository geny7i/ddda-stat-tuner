import type { StatId } from "../../domain";

export const STAT_LABELS: Readonly<Record<StatId, string>> = {
  hp: "HP",
  st: "ST",
  atk: "物理攻撃",
  matk: "魔法攻撃",
  def: "物理防御",
  mdef: "魔法防御",
};
