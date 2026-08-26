import { headers } from "next/headers";

import { RoleControl } from "@/components/admin/admin-controls";
import { requireAdmin } from "@/server/auth";
import { getAdminUsers } from "@/server/queries/admin";
import { isFixtureRuntime } from "@/server/env";

export const instant = false;

export default async function AdminUsersPage() {
  const [session, users] = await Promise.all([
    requireAdmin(await headers()),
    getAdminUsers(),
  ]);
  const readOnly = isFixtureRuntime();
  return (
    <div>
      <p className="eyebrow">ROLES</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-0.04em]">
        관리자 역할
      </h2>
      <p className="mt-3 max-w-3xl leading-7 text-[var(--ink-soft)]">
        DB 역할이 권한의 기준입니다. 현재 계정의 자기 강등과 마지막 관리자
        강등은 서버에서 차단합니다.
      </p>
      <div className="surface-card mt-7 overflow-x-auto">
        <table className="w-full min-w-[680px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] text-[var(--ink-soft)]">
              <th scope="col" className="px-5 py-4">
                사용자
              </th>
              <th scope="col" className="px-5 py-4">
                이메일
              </th>
              <th scope="col" className="px-5 py-4">
                현재 역할
              </th>
              <th scope="col" className="px-5 py-4">
                변경
              </th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr
                key={user.id}
                className="border-b border-[var(--line)] last:border-0"
              >
                <th scope="row" className="px-5 py-4 font-bold">
                  {user.name}
                </th>
                <td className="px-5 py-4">{user.email}</td>
                <td className="px-5 py-4 font-mono text-xs">{user.role}</td>
                <td className="px-5 py-4">
                  <RoleControl
                    userId={user.id}
                    role={user.role}
                    currentUserId={session.user.id}
                    readOnly={readOnly}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
