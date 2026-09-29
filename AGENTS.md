<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Keep visitor-region display logic in `src/lib/region.ts` so hydration-safe detection stays consistent across public and signed-in pages.
- Keep shared Manager invite instructions in `ManagerAccessInstructions` so onboarding and the public handoff page stay aligned.
