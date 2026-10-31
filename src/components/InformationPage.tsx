import type { ReactNode } from 'react';
import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
export default function InformationPage({ title, description, updated = false, children }: { title: string; description: string; updated?: boolean; children: ReactNode }) {
  useDocumentTitle(title);
  useDocumentMeta(title, description);
  return <div className="nb-theme" style={{ minHeight:'100%', background:'var(--nm-bg)' }}><Navbar /><main className="nm-information-page"><header><p className="nm-information-eyebrow">NEURAL MASTERY</p><h1>{title}</h1>{updated && <p className="nm-information-updated">Last updated 31 October 2026</p>}</header><div className="nm-information-body">{children}</div></main></div>;
}
