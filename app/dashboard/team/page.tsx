'use client';

import { useState } from 'react';
import Link from 'next/link';

type Role = 'OWNER' | 'ADMIN' | 'OPERATOR' | 'VIEWER';
type MemberStatus = 'ACTIVE' | 'PENDING';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: MemberStatus;
  lastActive: string;
  avatarColor: string;
}

interface PendingInvite {
  id: string;
  email: string;
  role: Role;
  invitedAt: string;
}

const ROLE_STYLES: Record<Role, { label: string; className: string }> = {
  OWNER: {
    label: 'OWNER',
    className: 'border border-amber-400/40 bg-amber-400/15 text-amber-200',
  },
  ADMIN: {
    label: 'ADMIN',
    className: 'border border-red-500/40 bg-red-500/15 text-red-200',
  },
  OPERATOR: {
    label: 'OPERATOR',
    className: 'border border-blue-400/40 bg-blue-400/15 text-blue-200',
  },
  VIEWER: {
    label: 'VIEWER',
    className: 'border border-slate-500/40 bg-slate-500/15 text-slate-300',
  },
};

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  OWNER: 'Full control. Manage billing, delete org, transfer ownership. Only one owner per org.',
  ADMIN: 'Manage team members, policies, agents, and integrations. Cannot access billing or transfer ownership.',
  OPERATOR: 'Execute actions, manage integrations, view audit logs. Cannot manage team members or policies.',
  VIEWER: 'Read-only access to dashboard, executions, proofs, and audit logs.',
};

function hashColor(name: string): string {
  const colors = [
    'bg-amber-500/80',
    'bg-blue-500/80',
    'bg-emerald-600/80',
    'bg-violet-500/80',
    'bg-rose-500/80',
    'bg-cyan-600/80',
    'bg-orange-500/80',
    'bg-indigo-500/80',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

const INITIAL_MEMBERS: TeamMember[] = [
  {
    id: 'mem_001',
    name: 'Alex Rivera',
    email: 'alex.rivera@acmecorp.com',
    role: 'OWNER',
    status: 'ACTIVE',
    lastActive: '2 minutes ago',
    avatarColor: '',
  },
  {
    id: 'mem_002',
    name: 'Jordan Chen',
    email: 'jordan.chen@acmecorp.com',
    role: 'ADMIN',
    status: 'ACTIVE',
    lastActive: '1 hour ago',
    avatarColor: '',
  },
  {
    id: 'mem_003',
    name: 'Morgan Davies',
    email: 'morgan.davies@acmecorp.com',
    role: 'OPERATOR',
    status: 'ACTIVE',
    lastActive: '3 hours ago',
    avatarColor: '',
  },
  {
    id: 'mem_004',
    name: 'Sam Okafor',
    email: 'sam.okafor@acmecorp.com',
    role: 'OPERATOR',
    status: 'ACTIVE',
    lastActive: 'Yesterday',
    avatarColor: '',
  },
  {
    id: 'mem_005',
    name: 'Taylor Kim',
    email: 'taylor.kim@acmecorp.com',
    role: 'VIEWER',
    status: 'ACTIVE',
    lastActive: '2 days ago',
    avatarColor: '',
  },
  {
    id: 'mem_006',
    name: 'Casey Patel',
    email: 'casey.patel@acmecorp.com',
    role: 'VIEWER',
    status: 'ACTIVE',
    lastActive: '5 days ago',
    avatarColor: '',
  },
];

const INITIAL_PENDING: PendingInvite[] = [
  {
    id: 'inv_001',
    email: 'dev.lead@partnerco.io',
    role: 'OPERATOR',
    invitedAt: '2 days ago',
  },
  {
    id: 'inv_002',
    email: 'auditor@compliancefirm.com',
    role: 'VIEWER',
    invitedAt: '4 days ago',
  },
];

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>(INITIAL_MEMBERS);
  const [pending, setPending] = useState<PendingInvite[]>(INITIAL_PENDING);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<Role>('VIEWER');
  const [inviteError, setInviteError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>('VIEWER');
  const [revokeConfirmId, setRevokeConfirmId] = useState<string | null>(null);
  const [cancelInviteId, setCancelInviteId] = useState<string | null>(null);

  function handleInvite() {
    setInviteError('');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(inviteEmail)) {
      setInviteError('Enter a valid email address.');
      return;
    }
    if (members.some((m) => m.email === inviteEmail) || pending.some((p) => p.email === inviteEmail)) {
      setInviteError('This email is already a member or has a pending invite.');
      return;
    }
    const newInvite: PendingInvite = {
      id: `inv_${Date.now()}`,
      email: inviteEmail,
      role: inviteRole,
      invitedAt: 'just now',
    };
    setPending((prev) => [newInvite, ...prev]);
    setInviteEmail('');
    setInviteRole('VIEWER');
    setShowInviteForm(false);
  }

  function handleEditSave(memberId: string) {
    setMembers((prev) =>
      prev.map((m) => (m.id === memberId ? { ...m, role: editRole } : m))
    );
    setEditingId(null);
  }

  function handleRevoke(memberId: string) {
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setRevokeConfirmId(null);
  }

  function handleCancelInvite(inviteId: string) {
    setPending((prev) => prev.filter((p) => p.id !== inviteId));
    setCancelInviteId(null);
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <section className="rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(212,175,55,0.14),rgba(15,23,42,0.92)_45%,rgba(245,197,92,0.06))] p-6">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-200">DSG Enterprise</p>
              <h1 className="mt-3 text-4xl font-black tracking-tight text-white md:text-5xl">Team Management</h1>
              <p className="mt-4 text-sm leading-7 text-slate-300">
                Manage who has access to your DSG control plane. Assign roles, invite collaborators, and revoke access — all changes take effect immediately.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setShowInviteForm((v) => !v)}
                className="rounded-2xl bg-amber-300 px-5 py-3 text-sm font-black text-slate-950"
              >
                {showInviteForm ? 'Cancel invite' : '+ Invite member'}
              </button>
              <Link href="/dashboard" className="rounded-2xl border border-white/15 px-5 py-3 text-sm font-bold text-slate-200">
                Back to dashboard
              </Link>
            </div>
          </div>
        </section>

        {/* Invite form */}
        {showInviteForm && (
          <section className="mt-6 rounded-3xl border border-amber-300/30 bg-amber-300/5 p-6">
            <h2 className="text-lg font-black text-white">Invite a team member</h2>
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Email address
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 placeholder-slate-500 focus:border-amber-300/60 focus:outline-none"
                />
              </div>
              <div className="w-44">
                <label className="mb-1 block text-xs font-semibold uppercase tracking-widest text-slate-400">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as Role)}
                  className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 focus:border-amber-300/60 focus:outline-none"
                >
                  <option value="ADMIN">ADMIN</option>
                  <option value="OPERATOR">OPERATOR</option>
                  <option value="VIEWER">VIEWER</option>
                </select>
              </div>
              <button
                onClick={handleInvite}
                className="rounded-xl bg-amber-300 px-6 py-3 text-sm font-black text-slate-950"
              >
                Send invite
              </button>
            </div>
            {inviteError && (
              <p className="mt-3 text-sm font-semibold text-red-400">{inviteError}</p>
            )}
          </section>
        )}

        {/* Members table */}
        <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Active members</p>
              <h2 className="mt-1 text-2xl font-black text-white">{members.length} member{members.length !== 1 ? 's' : ''}</h2>
            </div>
          </div>

          {members.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-700 py-16 text-center">
              <p className="text-lg font-bold text-slate-400">No active members</p>
              <p className="mt-2 text-sm text-slate-500">Invite someone to get started.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Member</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Role</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Status</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Last active</th>
                    <th className="pb-3 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {members.map((member) => (
                    <tr key={member.id} className="group">
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <span
                            className={`inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full text-xs font-black text-white ${hashColor(member.name)}`}
                          >
                            {initials(member.name)}
                          </span>
                          <div>
                            <p className="font-semibold text-slate-100">{member.name}</p>
                            <p className="text-xs text-slate-500">{member.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        {editingId === member.id ? (
                          <select
                            value={editRole}
                            onChange={(e) => setEditRole(e.target.value as Role)}
                            className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-semibold text-slate-100 focus:outline-none"
                          >
                            <option value="ADMIN">ADMIN</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="VIEWER">VIEWER</option>
                          </select>
                        ) : (
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLES[member.role].className}`}>
                            {ROLE_STYLES[member.role].label}
                          </span>
                        )}
                      </td>
                      <td className="py-4 pr-4">
                        <span className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              member.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-amber-400'
                            }`}
                          />
                          <span className="text-xs font-semibold text-slate-300">{member.status}</span>
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs text-slate-400">{member.lastActive}</td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {member.role !== 'OWNER' && (
                            <>
                              {editingId === member.id ? (
                                <>
                                  <button
                                    onClick={() => handleEditSave(member.id)}
                                    className="rounded-lg border border-amber-300/40 bg-amber-300/10 px-3 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-300/20"
                                  >
                                    Save
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400 hover:bg-slate-800"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => { setEditingId(member.id); setEditRole(member.role); }}
                                  className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-amber-300/30"
                                >
                                  Edit role
                                </button>
                              )}
                              {revokeConfirmId === member.id ? (
                                <>
                                  <button
                                    onClick={() => handleRevoke(member.id)}
                                    className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300 hover:bg-red-500/25"
                                  >
                                    Confirm revoke
                                  </button>
                                  <button
                                    onClick={() => setRevokeConfirmId(null)}
                                    className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400"
                                  >
                                    Cancel
                                  </button>
                                </>
                              ) : (
                                <button
                                  onClick={() => setRevokeConfirmId(member.id)}
                                  className="rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-bold text-red-400 hover:border-red-500/40 hover:bg-red-500/15"
                                >
                                  Revoke
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Pending invitations */}
        {pending.length > 0 && (
          <section className="mt-8 rounded-3xl border border-slate-800 bg-slate-900 p-6">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Pending invitations</p>
            <h2 className="mt-1 text-2xl font-black text-white">{pending.length} pending</h2>
            <div className="mt-5 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Email</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Role</th>
                    <th className="pb-3 text-left text-xs font-bold uppercase tracking-widest text-slate-500">Invited</th>
                    <th className="pb-3 text-right text-xs font-bold uppercase tracking-widest text-slate-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {pending.map((invite) => (
                    <tr key={invite.id}>
                      <td className="py-4 pr-4">
                        <div className="flex items-center gap-3">
                          <span className="flex h-2 w-2 rounded-full bg-amber-400" />
                          <span className="font-semibold text-slate-300">{invite.email}</span>
                        </div>
                      </td>
                      <td className="py-4 pr-4">
                        <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLES[invite.role].className}`}>
                          {invite.role}
                        </span>
                      </td>
                      <td className="py-4 pr-4 text-xs text-slate-400">{invite.invitedAt}</td>
                      <td className="py-4 text-right">
                        {cancelInviteId === invite.id ? (
                          <span className="inline-flex gap-2">
                            <button
                              onClick={() => handleCancelInvite(invite.id)}
                              className="rounded-lg border border-red-500/40 bg-red-500/15 px-3 py-1.5 text-xs font-bold text-red-300"
                            >
                              Confirm cancel
                            </button>
                            <button
                              onClick={() => setCancelInviteId(null)}
                              className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs font-bold text-slate-400"
                            >
                              Keep
                            </button>
                          </span>
                        ) : (
                          <button
                            onClick={() => setCancelInviteId(invite.id)}
                            className="rounded-lg border border-slate-700 bg-slate-800/50 px-3 py-1.5 text-xs font-bold text-slate-300 hover:border-red-500/30"
                          >
                            Cancel invite
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Role explanations */}
        <section className="mt-8 rounded-3xl border border-white/10 bg-[#0b0d10] p-6">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Role permissions</p>
          <h2 className="mt-3 text-2xl font-black text-white">What each role can do</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-2">
            {(Object.keys(ROLE_DESCRIPTIONS) as Role[]).map((role) => (
              <article key={role} className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-bold ${ROLE_STYLES[role].className}`}>
                  {role}
                </span>
                <p className="mt-3 text-sm leading-7 text-slate-300">{ROLE_DESCRIPTIONS[role]}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
