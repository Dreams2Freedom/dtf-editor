# AI Image Generator Documentation

## Overview

The AI Image Generator is a 3-step wizard-based interface that helps users create DTF-ready images with transparent backgrounds using AI. It supports two input modes:

1. **Guided Mode** - Conversational chat interface for building optimized prompts
2. **Upload Image** - Analyze existing images to recreate or modify them

## User Flow

```
┌─────────────────────────────────────────────────────────────┐
│                      AI Image Generator                      │
│                    (/generate page)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  Step 1: Describe Your Image                 │
│                    (DescriptionStep.tsx)                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Choose Input Mode:                                          │
│  ┌─────────────────┐  ┌─────────────────┐                  │
│  │  Guided Mode    │  │  Upload Image   │                  │
│  │  (Chat with AI) │  │  (Analyze img)  │                  │
│  └─────────────────┘  └─────────────────┘                  │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│               Step 2: Choose Your Prompt                     │
│              (PromptOptimizationStep.tsx)                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  • View original description (default selected)              │
│  • Choose from 4 AI-optimized variations                     │
│  • Edit any prompt to customize it                           │
│                                                               │
│  NOTE: If using Guided Mode or Upload Image, this step       │
│  is skipped since the prompt is already optimized.           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│           Step 3: Configure & Generate                       │
│            (GenerationConfigStep.tsx)                        │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  • Review final prompt                                       │
│  • Select image size (1024x1024)                             │
│  • Quality is locked to "high" for best results             │
│  • Generate image (1 credit)                                 │
│                                                               │
│  After generation:                                           │
│  • Download image                                            │
│  • Remove background                                         │
│  • Process further                                           │
│  • Refine prompt with AI Chat (returns to Step 1)           │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Architecture

### Component Hierarchy

```
src/app/generate/page.tsx
  └─ PromptWizard.tsx (Main wizard container)
      ├─ DescriptionStep.tsx (Step 1)
      │   ├─ ConversationalPromptBuilder.tsx (Guided Mode)
      │   │   └─ ChatMessage.tsx
      │   └─ ImageToImageUpload.tsx (Upload Image mode)
      │
      ├─ PromptOptimizationStep.tsx (Step 2)
      │   └─ TransparentBackgroundBadge.tsx
      │
      └─ GenerationConfigStep.tsx (Step 3)
          └─ TransparentBackgroundBadge.tsx
```

### Key Files

| File | Purpose | Lines |
|------|---------|-------|
| `PromptWizard.tsx` | Main wizard state management and flow control | ~480 |
| `DescriptionStep.tsx` | Step 1: Input mode selection and description entry | ~240 |
| `ConversationalPromptBuilder.tsx` | Guided Mode: Chat-based prompt building | ~525 |
| `ImageToImageUpload.tsx` | Upload Image mode: Image analysis | ~235 |
| `PromptOptimizationStep.tsx` | Step 2: AI prompt optimization and selection | ~343 |
| `GenerationConfigStep.tsx` | Step 3: Generation config and results | ~395 |

### API Routes

| Route | Purpose |
|-------|---------|
| `/api/generate/image` | Generate AI image from prompt using OpenAI |
| `/api/generate/optimize-prompt` | Generate 4 optimized prompt variations |
| `/api/generate/conversational-prompt` | Handle conversational prompt building (chat) |
| `/api/analyze/image` | Analyze uploaded image and generate recreation prompt |

## Mode Details

### Guided Mode (Conversational)

**Component:** `ConversationalPromptBuilder.tsx`

**Flow:**
1. User describes what they want to create
2. AI asks 5 clarifying questions about:
   - Subject/content
   - Style preferences
   - Colors
   - Background elements
   - Specific details
3. AI generates optimized prompt based on conversation
4. User can edit final prompt or generate directly

**Features:**
- Message bubbles (user/AI)
- Typing indicator
- Quick reply buttons
- Progress tracking (X of 5 questions)
- Final prompt preview with edit capability
- localStorage persistence (recovers conversations < 1 hour old)

**UX Benefits:**
- Guides beginners through prompt creation
- Ensures all important details are captured
- Produces high-quality, detailed prompts
- Natural conversation flow

### Upload Image Mode

**Component:** `ImageToImageUpload.tsx`

**Flow:**
1. User drags/drops or selects an image
2. User optionally describes modifications:
   - Change text
   - Remove elements
   - Change colors
   - Add elements
   - Modify style
3. AI analyzes image and generates recreation prompt
4. Prompt is automatically passed to Step 3 for generation

**Features:**
- Drag-and-drop upload
- Image preview
- Modification instructions textarea with examples
- Clear "Analyze & Generate Prompt" button
- 50MB file size limit

**UX Benefits:**
- Easy recreation of existing designs
- Ability to modify designs before recreation
- Visual feedback with image preview
- Clear instructions and examples

## Technical Details

### State Management

**PromptWizard.tsx** manages global wizard state:
- Current step (1, 2, or 3)
- User description
- Input mode (`'guided' | 'upload'`)
- Optimized prompts array
- Selected prompt index
- Edited prompt
- Generation options (size, quality)
- Generated images
- Loading states

**localStorage Persistence:**
- Wizard progress saved to `ai_wizard_progress`
- Conversational state saved to `ai_conversation_state`
- Auto-cleared after successful generation
- Conversation recovery for < 1 hour old sessions

### Credit System

- **1 credit per image** (using "high" quality)
- Quality is locked to "high" for best transparent backgrounds
- Admins bypass credit checks
- Free users cannot access (redirected to pricing)

### Image Generation

**Model:** OpenAI GPT-Image-1 (Beta)

**Enhancements:**
- All prompts automatically enhanced for DTF printing
- Transparent backgrounds forced
- Vibrant colors emphasized
- Print-ready formatting

**Parameters:**
- Size: 1024x1024 (locked)
- Quality: high (locked)
- Style: Not supported by gpt-image-1
- Count: 1 image per generation

### Database Schema

Generated images are saved to `processed_images` table with:
- `operation_type: 'generate'`
- `storage_url`: Path in Supabase Storage
- `metadata`: Includes original prompt, timestamp

## Troubleshooting

### Common Issues

**Issue: Images not appearing in My Images**
- **Cause:** Database constraint didn't include 'generate' operation type
- **Fix:** Applied migration `20251007_add_generate_operation_type.sql`
- **Status:** ✅ Fixed

**Issue: Edited prompts not being used for generation**
- **Cause:** Prompt selection cards remained clickable, clearing edited prompt
- **Fix:** Hide cards when edited prompt exists, add "Discard" button
- **Status:** ✅ Fixed

**Issue: "Simple Mode" references still in code**
- **Cause:** Legacy code from previous 3-mode implementation
- **Fix:** Removed all Simple Mode code and references
- **Status:** ✅ Fixed

### Debug Checklist

1. **Check user credits:**
   ```sql
   SELECT credits_remaining FROM profiles WHERE id = 'user-id';
   ```

2. **Check operation_type constraint:**
   ```sql
   SELECT conname, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE conname = 'processed_images_operation_type_check';
   ```

3. **Check generated images:**
   ```sql
   SELECT * FROM processed_images
   WHERE user_id = 'user-id'
   AND operation_type = 'generate'
   ORDER BY created_at DESC
   LIMIT 10;
   ```

4. **Check API logs:**
   - `/api/generate/image` - Image generation errors
   - `/api/generate/optimize-prompt` - Prompt optimization errors
   - `/api/generate/conversational-prompt` - Chat errors

## Development

### Adding New Features

**To add a new generation option:**
1. Update `GenerationOptions` interface in `PromptWizard.tsx`
2. Add UI controls in `GenerationConfigStep.tsx`
3. Pass option to `/api/generate/image` endpoint
4. Update OpenAI API call with new parameter

**To modify the conversation flow:**
1. Edit prompts in `/api/generate/conversational-prompt/route.ts`
2. Adjust `progress.total` in `ConversationalPromptBuilder.tsx`
3. Update quick replies logic
4. Test full conversation flow

### Testing

**Manual test flow:**
1. Navigate to `/generate`
2. Try Guided Mode:
   - Start conversation
   - Answer all questions
   - Edit final prompt
   - Generate image
3. Try Upload Image mode:
   - Upload test image
   - Add modifications
   - Generate from image
4. Test Step 2 (if using direct description):
   - Choose different prompts
   - Edit a prompt
   - Regenerate prompts from edit
5. Verify images appear in `/dashboard` (My Images)

**Key things to test:**
- ✅ Credit deduction
- ✅ Image saves to gallery
- ✅ localStorage persistence
- ✅ Error handling (insufficient credits, API errors)
- ✅ Mobile responsiveness
- ✅ Step navigation (back/forward)

## Performance

### Optimization Strategies

**Image Generation Time:**
- 15-30 seconds typical
- Show loading state with progress message
- Display "may take up to 30 seconds" notice

**Chat Response Time:**
- 2-5 seconds typical
- Show typing indicator
- Prevent duplicate sends while loading

**localStorage:**
- Minimal performance impact
- Cleared after successful generation
- 1-hour recovery window

### Bundle Size

Components are lazy-loaded where possible:
- Large AI components only loaded when needed
- Image previews use Next.js Image optimization

## Future Improvements

### Planned Features

1. **Batch Generation**
   - Generate multiple variations at once
   - Compare side-by-side

2. **Style Presets**
   - Pre-defined style templates
   - One-click style application

3. **Advanced Editing**
   - In-conversation image refinement
   - Iterative improvements

4. **History & Favorites**
   - Save conversation threads
   - Favorite prompts for reuse

5. **Collaboration**
   - Share prompts with team
   - Comment on generated images

### Technical Debt

- [ ] Add comprehensive unit tests
- [ ] Add E2E tests with Playwright
- [ ] Implement proper error boundaries
- [ ] Add Sentry error tracking
- [ ] Optimize re-renders in wizard
- [ ] Add loading skeletons
- [ ] Implement proper caching for repeated prompts

## Migration from Simple Mode

### What Changed

**Before (3 modes):**
- Simple Mode: Direct textarea input
- Guided Mode: Conversational interface
- Upload Image: Image analysis

**After (2 modes):**
- Guided Mode: Conversational interface (KEPT)
- Upload Image: Image analysis (KEPT)
- Simple Mode: REMOVED

**Removed Files:**
- `ImageGenerator.tsx` (~546 lines)
- `PromptBuilder.tsx` (~174 lines)
- `ImageToImageDirect.tsx` (~200 lines)

**Total cleanup:** ~920 lines of dead code removed

### Rationale

- Guided Mode provides better results than Simple Mode
- Conversational flow helps users create detailed prompts
- Upload Image covers the "quick recreation" use case
- Reducing modes simplifies UX and reduces cognitive load
- Less code to maintain = fewer bugs

### User Impact

- **Zero user-facing changes** for Guided Mode and Upload Image users
- Simple Mode users automatically redirected to Guided Mode
- Better prompts = better results
- Cleaner, more intuitive interface

## Questions?

For questions or issues, refer to:
- `DTF_EDITOR_PRD.md` - Product requirements
- `DEVELOPMENT_LOG.md` - Recent changes
- `BUGS_TRACKER.md` - Known issues
- `API_CODE_EXAMPLES.md` - API integration examples
