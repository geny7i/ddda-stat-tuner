import type { VocationId } from "../../domain";
import fighter from "../../assets/vocations/fighter.svg";
import strider from "../../assets/vocations/strider.svg";
import mage from "../../assets/vocations/mage.svg";
import warrior from "../../assets/vocations/warrior.svg";
import ranger from "../../assets/vocations/ranger.svg";
import sorcerer from "../../assets/vocations/sorcerer.svg";
import assassin from "../../assets/vocations/assassin.svg";
import magickArcher from "../../assets/vocations/magick_archer.svg";
import mysticKnight from "../../assets/vocations/mystic_knight.svg";

const iconByVocation: Record<VocationId, string> = {
  fighter,
  strider,
  mage,
  warrior,
  ranger,
  sorcerer,
  assassin,
  magick_archer: magickArcher,
  mystic_knight: mysticKnight,
};

export function VocationIcon({ vocationId }: { vocationId: VocationId }) {
  return (
    <img
      className="vocation-icon"
      src={iconByVocation[vocationId]}
      alt=""
      aria-hidden="true"
      width="20"
      height="20"
    />
  );
}
