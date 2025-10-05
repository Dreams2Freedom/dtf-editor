# Shadcn Component Refactor Plan

**Created:** 2025-10-04
**Rollback Point:** `pre-shadcn-refactor` tag
**Estimated Total Time:** 8-11 hours

## 🔴 ROLLBACK INSTRUCTIONS

If anything breaks during this refactor, rollback with:

```bash
# Option 1: Hard reset to rollback point (destructive - loses all changes)
git reset --hard pre-shadcn-refactor

# Option 2: Create a new branch from rollback point (preserves changes)
git checkout -b refactor-backup
git checkout main
git reset --hard pre-shadcn-refactor

# Option 3: Selective file restore
git checkout pre-shadcn-refactor -- <file-path>
```

---

## 📊 Audit Summary

**Total Issues Found:** 62
**Files Affected:** 9
**New Components Needed:** 3

### Issues by Priority:
- **Critical:** 15 (raw HTML form elements)
- **High:** 28 (arbitrary color values, inconsistent design tokens)
- **Medium:** 14 (custom patterns, inconsistent component usage)
- **Low:** 5 (minor inconsistencies)

---

## 🎯 Refactor Phases

### Phase 1: Create Missing Shadcn Components (1 hour)

**Estimated Time:** 1 hour
**Priority:** CRITICAL

#### 1.1 Create Checkbox Component (30 min)

**File:** `src/components/ui/Checkbox.tsx`

```tsx
"use client";

import * as React from "react";
import * as CheckboxPrimitive from "@radix-ui/react-checkbox";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

const Checkbox = React.forwardRef<
  React.ElementRef<typeof CheckboxPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof CheckboxPrimitive.Root>
>(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root
    ref={ref}
    className={cn(
      "peer h-4 w-4 shrink-0 rounded border border-gray-300 shadow-sm",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "data-[state=checked]:bg-primary-500 data-[state=checked]:border-primary-500 data-[state=checked]:text-white",
      "transition-colors",
      className
    )}
    {...props}
  >
    <CheckboxPrimitive.Indicator className="flex items-center justify-center text-current">
      <Check className="h-3 w-3" />
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName;

export { Checkbox };
```

**Install Dependency:**
```bash
npm install @radix-ui/react-checkbox
```

**Used In:**
- Settings page (5 checkboxes)
- Future form components

---

#### 1.2 Create DropdownMenu Component (30 min)

**File:** `src/components/ui/DropdownMenu.tsx`

```tsx
"use client";

import * as React from "react";
import * as DropdownMenuPrimitive from "@radix-ui/react-dropdown-menu";
import { Check, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

const DropdownMenu = DropdownMenuPrimitive.Root;
const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger;
const DropdownMenuGroup = DropdownMenuPrimitive.Group;
const DropdownMenuPortal = DropdownMenuPrimitive.Portal;
const DropdownMenuSub = DropdownMenuPrimitive.Sub;
const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;

const DropdownMenuSubTrigger = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubTrigger>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubTrigger> & {
    inset?: boolean;
  }
>(({ className, inset, children, ...props }, ref) => (
  <DropdownMenuPrimitive.SubTrigger
    ref={ref}
    className={cn(
      "flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
      "focus:bg-gray-100 data-[state=open]:bg-gray-100",
      inset && "pl-8",
      className
    )}
    {...props}
  >
    {children}
    <ChevronRight className="ml-auto h-4 w-4" />
  </DropdownMenuPrimitive.SubTrigger>
));
DropdownMenuSubTrigger.displayName = DropdownMenuPrimitive.SubTrigger.displayName;

const DropdownMenuSubContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.SubContent>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.SubContent>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.SubContent
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-lg",
      "data-[state=open]:animate-in data-[state=closed]:animate-out",
      "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
      "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
      "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
DropdownMenuSubContent.displayName = DropdownMenuPrimitive.SubContent.displayName;

const DropdownMenuContent = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <DropdownMenuPrimitive.Portal>
    <DropdownMenuPrimitive.Content
      ref={ref}
      sideOffset={sideOffset}
      className={cn(
        "z-50 min-w-[8rem] overflow-hidden rounded-md border border-gray-200 bg-white p-1 shadow-md",
        "data-[state=open]:animate-in data-[state=closed]:animate-out",
        "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
        "data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        className
      )}
      {...props}
    />
  </DropdownMenuPrimitive.Portal>
));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;

const DropdownMenuItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Item> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none",
      "transition-colors focus:bg-gray-100 focus:text-gray-900",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;

const DropdownMenuCheckboxItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.CheckboxItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.CheckboxItem>
>(({ className, children, checked, ...props }, ref) => (
  <DropdownMenuPrimitive.CheckboxItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
      "transition-colors focus:bg-gray-100 focus:text-gray-900",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    checked={checked}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.CheckboxItem>
));
DropdownMenuCheckboxItem.displayName = DropdownMenuPrimitive.CheckboxItem.displayName;

const DropdownMenuRadioItem = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.RadioItem>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.RadioItem>
>(({ className, children, ...props }, ref) => (
  <DropdownMenuPrimitive.RadioItem
    ref={ref}
    className={cn(
      "relative flex cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
      "transition-colors focus:bg-gray-100 focus:text-gray-900",
      "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <DropdownMenuPrimitive.ItemIndicator>
        <div className="h-2 w-2 rounded-full bg-current" />
      </DropdownMenuPrimitive.ItemIndicator>
    </span>
    {children}
  </DropdownMenuPrimitive.RadioItem>
));
DropdownMenuRadioItem.displayName = DropdownMenuPrimitive.RadioItem.displayName;

const DropdownMenuLabel = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Label> & {
    inset?: boolean;
  }
>(({ className, inset, ...props }, ref) => (
  <DropdownMenuPrimitive.Label
    ref={ref}
    className={cn(
      "px-2 py-1.5 text-sm font-semibold",
      inset && "pl-8",
      className
    )}
    {...props}
  />
));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;

const DropdownMenuSeparator = React.forwardRef<
  React.ElementRef<typeof DropdownMenuPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof DropdownMenuPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <DropdownMenuPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-gray-200", className)}
    {...props}
  />
));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;

const DropdownMenuShortcut = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement>) => {
  return (
    <span
      className={cn("ml-auto text-xs tracking-widest opacity-60", className)}
      {...props}
    />
  );
};
DropdownMenuShortcut.displayName = "DropdownMenuShortcut";

export {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuRadioGroup,
};
```

**Install Dependency:**
```bash
npm install @radix-ui/react-dropdown-menu
```

**Used In:**
- UserListTable export dropdown
- UserListTable actions dropdown
- Future dropdown menus

---

#### 1.3 Create Alert Component (Optional - Low Priority)

**File:** `src/components/ui/Alert.tsx`

```tsx
"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { AlertCircle, CheckCircle, XCircle, Info } from "lucide-react";
import { cn } from "@/utils/cn";

const alertVariants = cva(
  "relative w-full rounded-lg border p-4",
  {
    variants: {
      variant: {
        default: "bg-gray-50 text-gray-900 border-gray-200",
        info: "bg-info-50 text-info-900 border-info-200",
        success: "bg-success-50 text-success-900 border-success-200",
        warning: "bg-warning-50 text-warning-900 border-warning-200",
        error: "bg-error-50 text-error-900 border-error-200",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

const Alert = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof alertVariants>
>(({ className, variant, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(alertVariants({ variant }), className)}
    {...props}
  />
));
Alert.displayName = "Alert";

const AlertTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h5
    ref={ref}
    className={cn("mb-1 font-medium leading-none tracking-tight", className)}
    {...props}
  />
));
AlertTitle.displayName = "AlertTitle";

const AlertDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertTitle, AlertDescription };
```

**Used In:**
- Admin login warning
- Settings page status indicators
- Error/success messages

---

### Phase 2: Fix Button Component Design Tokens (30 min)

**File:** `src/components/ui/Button.tsx`

**Changes Required:**
- Line 12-24: Replace `blue-600` with `primary-500`
- Replace `orange-500` with `accent-500`
- Replace arbitrary red/green with `error-500` and `success-500`

**Current:**
```tsx
variant: {
  default: 'bg-blue-600 text-white hover:bg-blue-700',
  accent: 'bg-orange-500 text-white hover:bg-orange-600',
  destructive: 'bg-red-500 text-white hover:bg-red-600',
  success: 'bg-green-500 text-white hover:bg-green-600',
}
```

**Fixed:**
```tsx
variant: {
  default: 'bg-primary-500 text-white hover:bg-primary-600',
  accent: 'bg-accent-500 text-white hover:bg-accent-600',
  destructive: 'bg-error-500 text-white hover:bg-error-600',
  success: 'bg-success-500 text-white hover:bg-success-600',
}
```

---

### Phase 3: Refactor Admin Settings Page (1.5 hours)

**File:** `src/app/admin/settings/page.tsx`

**Issues:** 15 total (5 critical, 8 high, 2 medium)

#### 3.1 Replace Raw Checkboxes (Lines 121-162)

**Before:**
```tsx
<input
  type="checkbox"
  checked={settings.new_user_alerts}
  onChange={(e) => setSettings({ ...settings, new_user_alerts: e.target.checked })}
  className="h-4 w-4 text-primary-blue rounded"
/>
```

**After:**
```tsx
import { Checkbox } from '@/components/ui/Checkbox';

<Checkbox
  checked={settings.new_user_alerts}
  onCheckedChange={(checked) => setSettings({ ...settings, new_user_alerts: checked as boolean })}
/>
```

**Apply to all 5 checkboxes:**
- Line 121: `new_user_alerts`
- Line 135: `subscription_changes`
- Line 149: `api_errors`

#### 3.2 Replace Raw Number Inputs (Lines 190, 256)

**Before:**
```tsx
<input
  type="number"
  value={settings.session_timeout}
  onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) })}
  className="w-full px-3 py-2 border rounded-lg"
  min="15"
  max="480"
/>
```

**After:**
```tsx
import { Input } from '@/components/ui/Input';

<Input
  type="number"
  value={settings.session_timeout}
  onChange={(e) => setSettings({ ...settings, session_timeout: parseInt(e.target.value) })}
  min="15"
  max="480"
/>
```

#### 3.3 Replace Raw Email Input (Line 284)

**Before:**
```tsx
<input
  type="email"
  value={settings.support_email}
  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
  className="w-full px-3 py-2 border rounded-lg"
/>
```

**After:**
```tsx
<Input
  type="email"
  label="Support Email Address"
  value={settings.support_email}
  onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
/>
```

#### 3.4 Fix Badge Variants (Lines 184, 228, 230, 326, 333, 340, 347)

**Invalid Variants to Fix:**
- `variant="gray"` → `variant="secondary"`
- `variant="yellow"` → `variant="warning"`
- `variant="green"` → `variant="success"`

#### 3.5 Fix Status Box Colors (Lines 321-349)

**Before:**
```tsx
<div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
  <Check className="w-5 h-5 text-green-600 mr-2" />
  <Badge variant="green">Healthy</Badge>
</div>
```

**After:**
```tsx
<div className="flex items-center justify-between p-3 bg-success-50 rounded-lg">
  <Check className="w-5 h-5 text-success-600 mr-2" />
  <Badge variant="success">Healthy</Badge>
</div>
```

---

### Phase 4: Refactor UserListTable (2 hours)

**File:** `src/components/admin/users/UserListTable.tsx`

**Issues:** 16 total (2 critical, 12 high, 2 medium)

#### 4.1 Replace Raw Search Input (Lines 423-429)

**Before:**
```tsx
<input
  type="text"
  placeholder="Search by email or name..."
  value={params.search || ''}
  onChange={(e) => handleSearch(e.target.value)}
  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg"
/>
```

**After:**
```tsx
import { Input } from '@/components/ui/Input';
import { Search } from 'lucide-react';

<Input
  type="text"
  placeholder="Search by email or name..."
  value={params.search || ''}
  onChange={(e) => handleSearch(e.target.value)}
  leftIcon={<Search />}
/>
```

#### 4.2 Replace Raw Select (Lines 436-444)

**Before:**
```tsx
<select
  value={params.status}
  onChange={(e) => handleStatusFilter(e.target.value as AdminUserListParams['status'])}
  className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
>
  <option value="all">All Status</option>
  <option value="active">Active</option>
  <option value="suspended">Suspended</option>
</select>
```

**After:**
```tsx
import { Select } from '@/components/ui/Select';
import { Filter } from 'lucide-react';

<Select
  value={params.status}
  onChange={(e) => handleStatusFilter(e.target.value as AdminUserListParams['status'])}
  leftIcon={<Filter />}
>
  <option value="all">All Status</option>
  <option value="active">Active</option>
  <option value="suspended">Suspended</option>
</Select>
```

#### 4.3 Fix Plan Badge Colors (Lines 321-332)

**Before:**
```tsx
const getPlanBadgeColor = (plan: string) => {
  switch (plan) {
    case 'starter': return 'bg-blue-100 text-blue-800';
    case 'basic': return 'bg-green-100 text-green-800';
    case 'pro': return 'bg-purple-100 text-purple-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

// Usage
<span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPlanBadgeColor(user.plan)}`}>
  {user.plan}
</span>
```

**After:**
```tsx
import { Badge } from '@/components/ui/Badge';

const getPlanBadgeVariant = (plan: string): 'default' | 'secondary' | 'success' | 'info' => {
  switch (plan) {
    case 'starter': return 'info';
    case 'basic': return 'success';
    case 'pro': return 'default';
    default: return 'secondary';
  }
};

// Usage
<Badge variant={getPlanBadgeVariant(user.plan)}>
  {user.plan}
</Badge>
```

#### 4.4 Fix Status Badge (Lines 335-346)

**Before:**
```tsx
const getStatusBadge = (status: string) => {
  return status === 'active' ? (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
      <CheckCircle className="w-3 h-3 mr-1" />
      Active
    </span>
  ) : (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
      <Ban className="w-3 h-3 mr-1" />
      Suspended
    </span>
  );
};
```

**After:**
```tsx
import { Badge } from '@/components/ui/Badge';

const getStatusBadge = (status: string) => {
  return status === 'active' ? (
    <Badge variant="success">
      <CheckCircle className="w-3 h-3 mr-1" />
      Active
    </Badge>
  ) : (
    <Badge variant="error">
      <Ban className="w-3 h-3 mr-1" />
      Suspended
    </Badge>
  );
};
```

#### 4.5 Replace Bulk Action Buttons (Lines 465-506)

**Before:**
```tsx
<button
  onClick={() => handleBulkAction('activate')}
  disabled={bulkActionLoading}
  className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
>
  <UserCheck className="w-4 h-4 mr-1" />
  Activate
</button>
```

**After:**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => handleBulkAction('activate')}
  disabled={bulkActionLoading}
  className="bg-success-100 text-success-700 hover:bg-success-200 border-success-300"
>
  <UserCheck className="w-4 h-4 mr-1" />
  Activate
</Button>
```

Apply same pattern to: suspend, email, credits, delete buttons

#### 4.6 Replace Pagination Buttons (Lines 724-760)

**Before:**
```tsx
<button
  onClick={() => handlePageChange(params.page! - 1)}
  disabled={params.page === 1}
  className="px-3 py-1 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
>
  <ChevronLeft className="h-4 w-4" />
</button>
```

**After:**
```tsx
<Button
  variant="outline"
  size="sm"
  onClick={() => handlePageChange(params.page! - 1)}
  disabled={params.page === 1}
>
  <ChevronLeft className="h-4 w-4" />
</Button>
```

#### 4.7 Fix Export Dropdown (Lines 363-411)

**Before:**
```tsx
<button
  onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
  className="btn btn-secondary"
>
  <Download className="h-4 w-4 mr-2" />
  Export
</button>
```

**After:**
```tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/DropdownMenu';

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="secondary" size="sm">
      <Download className="h-4 w-4 mr-2" />
      Export
    </Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={() => handleExport('csv')}>
      Export as CSV
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleExport('xlsx')}>
      Export as Excel
    </DropdownMenuItem>
    <DropdownMenuItem onClick={() => handleExport('pdf')}>
      Export as PDF
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

#### 4.8 Fix Action Dropdown (Lines 629-702)

Replace custom dropdown with DropdownMenu component (similar pattern to export dropdown)

---

### Phase 5: Refactor Admin Dashboard (1 hour)

**File:** `src/app/admin/page.tsx`

**Issues:** 8 total (4 critical, 4 high)

#### 5.1 Replace Quick Action Buttons (Lines 265-292)

**Before:**
```tsx
<button
  onClick={() => router.push('/admin/users')}
  className="p-4 text-center border border-gray-200 rounded-lg hover:bg-gray-50"
>
  <Users className="w-6 h-6 mx-auto mb-2 text-primary-blue" />
  <span className="text-sm font-medium">View All Users</span>
</button>
```

**After:**
```tsx
<Button
  variant="outline"
  onClick={() => router.push('/admin/users')}
  className="flex flex-col items-center p-4 h-auto"
>
  <Users className="w-6 h-6 mb-2 text-primary-500" />
  <span className="text-sm font-medium">View All Users</span>
</Button>
```

Apply to all 4 quick action buttons

#### 5.2 Fix Stat Card Icon Colors (Lines 130-136)

**Before:**
```tsx
<div className={`p-3 rounded-full ${trend === 'up' ? 'bg-green-100' : 'bg-blue-100'}`}>
  <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-green-600' : 'text-blue-600'}`} />
</div>
```

**After:**
```tsx
<div className={`p-3 rounded-full ${trend === 'up' ? 'bg-success-100' : 'bg-info-100'}`}>
  <Icon className={`w-6 h-6 ${trend === 'up' ? 'text-success-600' : 'text-info-600'}`} />
</div>
```

#### 5.3 Fix Trend Text Colors (Lines 118-127)

**Before:**
```tsx
<p className={`text-sm mt-2 flex items-center ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
```

**After:**
```tsx
<p className={`text-sm mt-2 flex items-center ${trend === 'up' ? 'text-success-600' : 'text-error-600'}`}>
```

---

### Phase 6: Fix Badge Component Usage (30 min)

**Files:**
- Settings page
- UserListTable
- Other admin pages using Badge

**Invalid Variants to Replace:**
- `gray` → `secondary`
- `yellow` → `warning`
- `green` → `success`
- `red` → `error`
- `blue` → `info` or `default`

---

### Phase 7: Update Color Classes (1 hour)

**Global Search & Replace Patterns:**

```bash
# Find all arbitrary green colors
grep -r "bg-green-" src/ --include="*.tsx"
grep -r "text-green-" src/ --include="*.tsx"

# Find all arbitrary blue colors
grep -r "bg-blue-" src/ --include="*.tsx"
grep -r "text-blue-" src/ --include="*.tsx"

# Find all arbitrary red colors
grep -r "bg-red-" src/ --include="*.tsx"
grep -r "text-red-" src/ --include="*.tsx"

# Find all arbitrary yellow/amber colors
grep -r "bg-yellow-" src/ --include="*.tsx"
grep -r "bg-amber-" src/ --include="*.tsx"
```

**Replace with Design Tokens:**
- `green-{n}` → `success-{n}`
- `red-{n}` → `error-{n}`
- `blue-{n}` → `primary-{n}` (for brand) or `info-{n}` (for informational)
- `orange-{n}` → `accent-{n}`
- `yellow-{n}` or `amber-{n}` → `warning-{n}`

---

### Phase 8: Test Admin Pages (1 hour)

**Manual Testing Checklist:**

- [ ] `/admin` - Dashboard loads, stat cards display correctly
- [ ] `/admin/users` - User table loads, search works, filters work
- [ ] `/admin/users` - Bulk actions work, pagination works
- [ ] `/admin/users` - Edit modal opens, selects render correctly
- [ ] `/admin/users` - Credit adjustment modal, textarea renders
- [ ] `/admin/settings` - Checkboxes toggle correctly
- [ ] `/admin/settings` - Number/email inputs work
- [ ] `/admin/settings` - Badge colors match design system
- [ ] `/admin/affiliates/*` - All affiliate pages load
- [ ] Mobile: All pages responsive (320px, 768px, 1024px)
- [ ] Accessibility: Keyboard navigation works
- [ ] Accessibility: Focus states visible

---

### Phase 9: Audit User-Facing Pages (2 hours)

**Files to Check:**
- `/dashboard`
- `/process`
- `/generate`
- `/pricing`
- `/about`
- Auth pages (login, signup, forgot password)

**Look For:**
- Raw HTML form elements
- Arbitrary color values
- Inconsistent button usage
- Missing component patterns

---

### Phase 10: Code Quality Review (1 hour)

**BEFORE DEPLOYMENT:** Run all changes through code-quality-guardian agent

**Code Quality Guardian Review:**
```bash
# This will be done via Claude Code Task tool
# The agent will check for:
# - Security vulnerabilities
# - Bugs and potential race conditions
# - Coding standards compliance
# - Best practices adherence
# - TypeScript type safety
# - Error handling
```

**What the Agent Checks:**
- [ ] No security vulnerabilities introduced
- [ ] Proper error handling in all new code
- [ ] TypeScript types are correct and strict
- [ ] No potential race conditions
- [ ] Follows project coding standards
- [ ] No performance regressions
- [ ] Proper accessibility attributes
- [ ] Component prop validation

### Phase 11: Final QA (1 hour)

**Cross-Browser Testing:**
- [ ] Chrome
- [ ] Firefox
- [ ] Safari
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

**Accessibility Audit:**
- [ ] Run Lighthouse accessibility audit
- [ ] Test with keyboard only
- [ ] Test with screen reader (VoiceOver/NVDA)
- [ ] Verify color contrast ratios

**Performance Check:**
- [ ] Run Lighthouse performance audit
- [ ] Check bundle size hasn't increased significantly
- [ ] Verify no console errors/warnings

---

## 📝 Testing Commands

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Build
npm run build

# Start production server
npm start

# Run in dev mode
npm run dev
```

---

## 🎨 Design Token Reference

**Use These:**
```tsx
// Brand Colors
primary-{50-900}    // #366494
accent-{50-900}     // #E88B4B
dark-{50-900}       // #233E5C
light-{50-900}      // #447CBA

// Semantic Colors
success-{50-900}    // Green
error-{50-900}      // Red
warning-{50-900}    // Yellow/Amber
info-{50-900}       // Blue

// Neutral
gray-{50-950}
```

**Avoid These:**
```tsx
// Arbitrary colors
blue-{n}           // Use primary-{n} or info-{n}
green-{n}          // Use success-{n}
red-{n}            // Use error-{n}
orange-{n}         // Use accent-{n}
yellow-{n}         // Use warning-{n}
amber-{n}          // Use warning-{n}
purple-{n}         // Not in design system
```

---

## 📦 Dependencies to Install

```bash
npm install @radix-ui/react-checkbox @radix-ui/react-dropdown-menu
```

---

## 🔍 Files Changed Summary

### New Files Created (3):
1. `src/components/ui/Checkbox.tsx`
2. `src/components/ui/DropdownMenu.tsx`
3. `src/components/ui/Alert.tsx` (optional)

### Files Modified (9):
1. `src/components/ui/Button.tsx`
2. `src/app/admin/settings/page.tsx`
3. `src/components/admin/users/UserListTable.tsx`
4. `src/app/admin/page.tsx`
5. `src/app/admin/login/page.tsx`
6. `src/components/admin/users/CreditAdjustmentModal.tsx`
7. `src/components/admin/users/UserEditModal.tsx`
8. `src/components/admin/settings/ApiCostConfig.tsx`
9. `src/app/admin/financial/page.tsx`

### Additional Files (found during Phase 9):
- TBD based on user-facing page audit

---

## ✅ Success Criteria

1. **Zero raw HTML form elements** in admin section
2. **All colors use design tokens** from tailwind.config.ts
3. **All Badge components** use valid variants
4. **Consistent button styling** across all pages
5. **No console errors** in production build
6. **All tests pass** (type-check, lint, build)
7. **Mobile responsive** at all breakpoints
8. **Accessibility score** 90+ in Lighthouse
9. **Visual consistency** matches PRD design system
10. **No breaking changes** to functionality

---

## 📞 Need Help?

If you encounter issues during refactoring:

1. **Check the rollback point**: `git log --oneline | grep "pre-shadcn-refactor"`
2. **Review individual file changes**: `git diff pre-shadcn-refactor <file>`
3. **Test incrementally**: Commit after each phase
4. **Document issues**: Add to BUGS_TRACKER.md

---

**Last Updated:** 2025-10-04
**Status:** Ready to Execute
**Estimated Completion:** 9-12 hours over 11 phases

## 🚀 Deployment Workflow

1. **Complete Phases 1-9** (Development & Testing)
2. **Run Code Quality Guardian** (Phase 10) - MANDATORY
3. **Address all issues** found by code-quality-guardian
4. **Final QA** (Phase 11)
5. **Create deployment commit**
6. **Deploy to production**

**IMPORTANT:** Do not skip the code-quality-guardian review. This is a critical safety check before deploying major changes.
