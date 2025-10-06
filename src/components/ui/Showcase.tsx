'use client';

import React, { useState } from 'react';
import { Button } from './Button';
import { Input } from './Input';
import { Modal } from './Modal';
import { Toast } from './Toast';
import { Loading } from './Loading';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './Card';
import { Badge } from './Badge';
import { Upload, Settings, User, Download } from 'lucide-react';

export function UIComponentShowcase() {
  const [modalOpen, setModalOpen] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastVariant, setToastVariant] = useState<
    'success' | 'error' | 'warning' | 'info'
  >('success');

  const showToast = (variant: typeof toastVariant) => {
    setToastVariant(variant);
    setToastOpen(true);
  };

  return (
    <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          DTF Editor UI Components
        </h1>

        {/* Button Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Buttons</CardTitle>
            <CardDescription>Various button styles and states</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button>Default Button</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="accent">Accent</Button>
              <Button variant="destructive">Destructive</Button>
              <Button variant="success">Success</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
              <Button size="xl">Extra Large</Button>
            </div>
            <div className="flex flex-wrap gap-4">
              <Button loading>Loading</Button>
              <Button leftIcon={<Upload className="w-4 h-4" />}>Upload</Button>
              <Button rightIcon={<Download className="w-4 h-4" />}>
                Download
              </Button>
              <Button disabled>Disabled</Button>
            </div>
          </CardContent>
        </Card>

        {/* Input Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Inputs</CardTitle>
            <CardDescription>
              Form input components with validation
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Default Input" placeholder="Enter text..." />
              <Input
                label="With Helper Text"
                placeholder="Enter text..."
                helperText="This is helper text"
              />
              <Input
                label="With Error"
                placeholder="Enter text..."
                error="This field is required"
              />
              <Input
                label="With Icon"
                placeholder="Search..."
                leftIcon={<User className="w-4 h-4" />}
              />
            </div>
          </CardContent>
        </Card>

        {/* Badge Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Badges</CardTitle>
            <CardDescription>Status indicators and labels</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Badge>Default</Badge>
              <Badge variant="secondary">Secondary</Badge>
              <Badge variant="success">Success</Badge>
              <Badge variant="warning">Warning</Badge>
              <Badge variant="error">Error</Badge>
              <Badge variant="info">Info</Badge>
              <Badge variant="outline">Outline</Badge>
            </div>
            <div className="flex flex-wrap gap-4 mt-4">
              <Badge size="sm">Small</Badge>
              <Badge size="md">Medium</Badge>
              <Badge size="lg">Large</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Loading Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Loading States</CardTitle>
            <CardDescription>Various loading indicators</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-8">
              <div className="flex flex-col items-center space-y-2">
                <Loading variant="spinner" size="sm" />
                <span className="text-sm text-gray-500">Spinner Small</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Loading variant="spinner" size="lg" />
                <span className="text-sm text-gray-500">Spinner Large</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Loading variant="dots" size="md" />
                <span className="text-sm text-gray-500">Dots</span>
              </div>
              <div className="flex flex-col items-center space-y-2">
                <Loading variant="pulse" size="md" />
                <span className="text-sm text-gray-500">Pulse</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Interactive Components */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Interactive Components</CardTitle>
            <CardDescription>Modal and Toast demonstrations</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-4">
              <Button onClick={() => setModalOpen(true)}>Open Modal</Button>
              <Button variant="secondary" onClick={() => showToast('success')}>
                Success Toast
              </Button>
              <Button variant="secondary" onClick={() => showToast('error')}>
                Error Toast
              </Button>
              <Button variant="secondary" onClick={() => showToast('warning')}>
                Warning Toast
              </Button>
              <Button variant="secondary" onClick={() => showToast('info')}>
                Info Toast
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Modal */}
        <Modal
          open={modalOpen}
          onOpenChange={setModalOpen}
          title="Example Modal"
          description="This is an example modal dialog"
        >
          <div className="space-y-4">
            <p>
              This modal demonstrates the Modal component with a title,
              description, and content.
            </p>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={() => setModalOpen(false)}>Confirm</Button>
            </div>
          </div>
        </Modal>

        {/* Toast */}
        <Toast
          open={toastOpen}
          onOpenChange={setToastOpen}
          title={
            toastVariant === 'success'
              ? 'Success!'
              : toastVariant === 'error'
                ? 'Error!'
                : toastVariant === 'warning'
                  ? 'Warning!'
                  : 'Info!'
          }
          description={`This is a ${toastVariant} toast notification.`}
          variant={toastVariant}
        />
      </div>
    </div>
  );
}
