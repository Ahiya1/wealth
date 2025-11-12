# Iteration 14 Plan - Export Engine Foundation

**Status:** Ready for Builder Execution
**Created:** 2025-11-09
**Estimated Duration:** 10-12 hours (4 builders working in parallel)

## Quick Start for Builders

### Before You Start

1. **Read in this order:**
   - `overview.md` - Project vision, success criteria, timeline
   - `tech-stack.md` - Technology decisions and rationale
   - `patterns.md` - **MOST IMPORTANT** - Copy-paste code examples
   - `builder-tasks.md` - Your specific task assignment

2. **Choose your builder role:**
   - Builder-1: Analytics Bug Fix + CSV Extensions (2-3 hours)
   - Builder-2: Excel Export Utility (3-4 hours)
   - Builder-3: AI Context + Archive Utility (3-4 hours)
   - Builder-4: tRPC Router + Database Migration (3-4 hours)

3. **Coordinate with team:**
   - Announce which builder you're taking
   - Builder-1 should start first (validates infrastructure)
   - Others can start after 30-60 minutes (once bug fix confirmed)

### File Breakdown

| File | Purpose | Lines | Who Reads |
|------|---------|-------|-----------|
| `overview.md` | Vision, success criteria, risks | ~250 | All builders (skim) |
| `tech-stack.md` | Technology stack with rationale | ~500 | All builders (reference) |
| `patterns.md` | **Code patterns to copy-paste** | ~1000 | **All builders (critical)** |
| `builder-tasks.md` | Task breakdown with estimates | ~800 | All builders (detailed) |

### Critical Notes

**Priority 0 (Builder-1):**
- Analytics export date range bug MUST be fixed first
- This validates the entire export infrastructure
- Other builders wait for confirmation (30-60 minutes)

**Dependencies:**
- Builder-4 depends on Builders 1-2 (can stub imports initially)
- Builders 1, 2, 3 are independent and can work in parallel

**Testing:**
- Manual testing only in Iteration 14 (no automated tests yet)
- Test all exports on multiple platforms (Excel, Google Sheets, Numbers)
- Validate CSV UTF-8 BOM (international characters)

### Integration Phase

After all builders complete:

1. Pull all feature branches
2. Resolve merge conflicts (minimal - isolated files)
3. Run database migration
4. Test all 18 export combinations (6 types × 3 formats)
5. Deploy to production (database migration required)

### Need Help?

**Stuck on a pattern?** Check `patterns.md` - all code is copy-pasteable

**Dependency blocking you?** Stub the import and continue, implement later

**Bug investigation taking >2 hours?** Escalate to planner

**Task taking longer than estimate?** Consider splitting (see builder-tasks.md)

---

**Ready to build!** 🚀

Start with `builder-tasks.md` to find your assignment.
