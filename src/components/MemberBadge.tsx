import { UserRound } from "lucide-react";
import type { FamilyMember } from "../types";

type Props = {
  member?: FamilyMember;
  size?: "sm" | "md";
  className?: string;
};

export default function MemberBadge({ member, size = "md", className = "" }: Props) {
  if (!member) return null;

  const avatarSize = size === "sm" ? "h-6 w-6" : "h-8 w-8";
  const textSize = size === "sm" ? "text-xs" : "text-sm";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full bg-white/75 py-1 pl-1 pr-3 font-bold text-slate-800 shadow-sm ring-1 ring-slate-100 ${textSize} ${className}`}
    >
      <span className={`inline-flex shrink-0 overflow-hidden rounded-full bg-slate-100 ${avatarSize}`}>
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} className="h-full w-full object-cover" />
        ) : (
          <span className={`flex h-full w-full items-center justify-center ${member.color}`}>
            <UserRound className={size === "sm" ? "h-3.5 w-3.5" : "h-4 w-4"} />
          </span>
        )}
      </span>
      <span>{member.name}</span>
    </span>
  );
}
