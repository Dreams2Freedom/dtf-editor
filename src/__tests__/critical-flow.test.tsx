import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ImageProcessor } from '@/components/image/ImageProcessor';
import { AuthProvider } from '@/contexts/AuthContext';

// Mock environment configuration
vi.mock('@/config/env', () => ({
  env: {
    DEEP_IMAGE_API_KEY: 'test-key',
    CLIPPINGMAGIC_API_KEY: 'test-key',
    VECTORIZER_API_KEY: 'test-key',
    SUPABASE_URL: 'https://test.supabase.co',
    SUPABASE_ANON_KEY: 'test-key',
  },
  isFeatureAvailable: vi.fn(() => true),
}));

// Mock the services
vi.mock('@/services/imageProcessing', () => ({
  imageProcessingService: {
    processImage: vi.fn(),
  },
}));
vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user', email: 'test@example.com' },
    profile: { credits_remaining: 10 },
    loading: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({
    get: () => null,
  }),
}));

// Mock file handling
const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
Object.defineProperty(mockFile, 'size', { value: 1024 * 1024 }); // 1MB

describe('Critical User Flow - Image Processing', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithAuth = (component: React.ReactElement) => {
    return render(<AuthProvider>{component}</AuthProvider>);
  };

  it('should complete the full image upscaling flow', async () => {
    const user = userEvent.setup();

    // Import after mocking
    const { imageProcessingService } = await import(
      '@/services/imageProcessing'
    );

    // Mock successful processing
    vi.mocked(imageProcessingService.processImage).mockResolvedValue({
      success: true,
      operation: 'upscale',
      originalUrl: 'original.jpg',
      processedUrl: 'processed.jpg',
      metadata: {
        processingTime: 5000,
        creditsUsed: 1,
      },
    });

    renderWithAuth(<ImageProcessor />);

    // 1. Verify initial state
    expect(screen.getByText(/upload an image/i)).toBeInTheDocument();
    expect(
      screen.getByText(/you have 10 credits remaining/i)
    ).toBeInTheDocument();

    // 2. Upload an image
    const fileInput = screen.getByLabelText(/drag & drop an image here/i, {
      selector: 'input',
    });
    await user.upload(fileInput, mockFile);

    // 3. Verify image preview appears
    await waitFor(() => {
      expect(screen.getByAltText('Original')).toBeInTheDocument();
    });

    // 4. Configure processing options
    const upscaleButton = screen.getByRole('button', { name: /upscale/i });
    await user.click(upscaleButton);

    const scale4xButton = screen.getByRole('button', { name: /4x/i });
    await user.click(scale4xButton);

    // 5. Start processing
    const processButton = screen.getByRole('button', {
      name: /upscale image \(1 credit\)/i,
    });
    await user.click(processButton);

    // 6. Verify processing state
    expect(screen.getByText(/processing\.\.\./i)).toBeInTheDocument();

    // 7. Wait for completion
    await waitFor(() => {
      expect(screen.getByText(/processing complete/i)).toBeInTheDocument();
    });

    // 8. Verify result display
    expect(screen.getByAltText('Processed')).toBeInTheDocument();
    expect(screen.getByText(/processed in 5\.0s/i)).toBeInTheDocument();
    expect(screen.getByText(/credits used: 1/i)).toBeInTheDocument();

    // 9. Verify download button
    expect(
      screen.getByRole('button', { name: /download/i })
    ).toBeInTheDocument();
  });

  it('should handle processing errors gracefully', async () => {
    const user = userEvent.setup();

    // Import after mocking
    const { imageProcessingService } = await import(
      '@/services/imageProcessing'
    );

    // Mock processing failure
    vi.mocked(imageProcessingService.processImage).mockResolvedValue({
      success: false,
      operation: 'upscale',
      originalUrl: 'original.jpg',
      error: 'Processing failed due to server error',
      metadata: {
        processingTime: 2000,
        creditsUsed: 0,
      },
    });

    renderWithAuth(<ImageProcessor />);

    // Upload and process image
    const fileInput = screen.getByLabelText(/drag & drop an image here/i, {
      selector: 'input',
    });
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByAltText('Original')).toBeInTheDocument();
    });

    const processButton = screen.getByRole('button', {
      name: /upscale image \(1 credit\)/i,
    });
    await user.click(processButton);

    // Verify error handling
    await waitFor(() => {
      expect(screen.getByText(/processing failed/i)).toBeInTheDocument();
      expect(
        screen.getByText(/processing failed due to server error/i)
      ).toBeInTheDocument();
    });
  });

  it('should prevent processing with insufficient credits', async () => {
    const user = userEvent.setup();

    // Mock user with no credits
    vi.doMock('@/stores/authStore', () => ({
      useAuthStore: () => ({
        user: { id: 'test-user', email: 'test@example.com' },
        profile: { credits_remaining: 0 },
        loading: false,
      }),
    }));

    renderWithAuth(<ImageProcessor />);

    const fileInput = screen.getByLabelText(/drag & drop an image here/i, {
      selector: 'input',
    });
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByAltText('Original')).toBeInTheDocument();
    });

    // Verify process button is disabled
    const processButton = screen.getByRole('button', {
      name: /upscale image \(1 credit\)/i,
    });
    expect(processButton).toBeDisabled();

    // Verify insufficient credits message
    expect(screen.getByText(/insufficient credits/i)).toBeInTheDocument();
  });

  it('should validate file types correctly', async () => {
    const user = userEvent.setup();

    renderWithAuth(<ImageProcessor />);

    // Try to upload invalid file type
    const invalidFile = new File(['test'], 'test.txt', { type: 'text/plain' });
    const fileInput = screen.getByLabelText(/drag & drop an image here/i, {
      selector: 'input',
    });

    await user.upload(fileInput, invalidFile);

    // Should show validation error
    await waitFor(() => {
      expect(
        screen.getByText(/please upload a jpeg, png, or webp image file/i)
      ).toBeInTheDocument();
    });
  });

  it('should switch between different operations', async () => {
    const user = userEvent.setup();

    renderWithAuth(<ImageProcessor />);

    const fileInput = screen.getByLabelText(/drag & drop an image here/i, {
      selector: 'input',
    });
    await user.upload(fileInput, mockFile);

    await waitFor(() => {
      expect(screen.getByAltText('Original')).toBeInTheDocument();
    });

    // Switch to background removal
    const backgroundRemovalButton = screen.getByRole('button', {
      name: /remove bg/i,
    });
    await user.click(backgroundRemovalButton);

    // Verify UI updates
    expect(screen.getByText(/background color/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /remove background \(1 credit\)/i })
    ).toBeInTheDocument();

    // Switch to vectorization
    const vectorizationButton = screen.getByRole('button', {
      name: /vectorize/i,
    });
    await user.click(vectorizationButton);

    // Verify UI updates for vectorization
    expect(screen.getByText(/output format/i)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /vectorize image \(2 credits\)/i })
    ).toBeInTheDocument();
  });
});

describe('Performance Tests', () => {
  it('should render ImageProcessor within performance budget', async () => {
    const startTime = performance.now();

    render(
      <AuthProvider>
        <ImageProcessor />
      </AuthProvider>
    );

    const endTime = performance.now();
    const renderTime = endTime - startTime;

    // Should render within 100ms
    expect(renderTime).toBeLessThan(100);
  });

  it('should handle file validation without blocking UI', async () => {
    const user = userEvent.setup();

    render(
      <AuthProvider>
        <ImageProcessor />
      </AuthProvider>
    );

    const fileInput = screen.getByLabelText(/drag & drop an image here/i, {
      selector: 'input',
    });

    const startTime = performance.now();
    await user.upload(fileInput, mockFile);
    const endTime = performance.now();

    // File validation should be fast
    expect(endTime - startTime).toBeLessThan(50);
  });
});
