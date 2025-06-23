'use client';

import { useState, useRef } from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Separator } from '../seperator';
import { CoinFormData } from './types';

interface BasicDetailsFormProps {
  form: UseFormReturn<CoinFormData>;
  selectedFileName: string;
  setSelectedFileName: (fileName: string) => void;
}

export function BasicDetailsForm({ form, selectedFileName, setSelectedFileName }: BasicDetailsFormProps) {
  const creationType = form.watch('creationType');
  const isNFT = creationType === 'nft';
  const [isDragOver, setIsDragOver] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (file: File | null, onChange: (file: File | undefined) => void) => {
    if (file) {
      setSelectedFileName(file.name);
      onChange(file);
      
      // Create preview URL
      const previewUrl = URL.createObjectURL(file);
      setImagePreview(previewUrl);
    } else {
      setSelectedFileName('');
      onChange(undefined);
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
      setImagePreview(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent, onChange: (file: File | undefined) => void) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        handleFileChange(file, onChange);
      }
    }
  };

  return (
    <>
      <Separator text="Basic Details" bg="bg-card" />

      <FormField
        control={form.control}
        name="name"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isNFT ? 'NFT Name' : 'Token Name'}</FormLabel>
            <FormControl>
              <Input placeholder={isNFT ? 'e.g., My Awesome NFT' : 'e.g., My Awesome Token'} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="symbol"
        render={({ field }) => (
          <FormItem>
            <FormLabel>{isNFT ? 'NFT Symbol' : 'Token Symbol'}</FormLabel>
            <FormControl>
              <Input placeholder={isNFT ? 'e.g., MANFT' : 'e.g., MAT'} {...field} />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Description (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder={isNFT ? 'Describe your NFT...' : 'Describe your token...'}
                {...field}
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      <FormField
        control={form.control}
        name="imageFile"
        render={({ field: { onChange, ...field } }) => (
          <FormItem>
            <FormLabel className="flex items-center gap-2">
              {isNFT ? 'NFT Image' : 'Token Icon (Optional)'}
            </FormLabel>
            <FormControl>
              <div className="space-y-4">
                {!selectedFileName ? (
                  <div
                    className={`relative border-2 border-dashed rounded-lg transition-all duration-200 cursor-pointer
                      ${isDragOver 
                        ? 'border-primary bg-primary/10 scale-[1.02]' 
                          : 'border-muted-foreground/25 hover:border-muted-foreground/50'
                      }
                    `}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, onChange)}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="flex flex-col items-center justify-center py-12 px-6">
                      <div className={`text-4xl mb-4 ${isNFT ? 'text-primary' : 'text-muted-foreground'}`}>
                        {isDragOver ? '📁' : isNFT ? '🖼️' : '📷'}
                      </div>
                      <div className="text-center space-y-2">
                        <p className={`font-medium ${isNFT ? 'text-primary' : 'text-foreground'}`}>
                          {isDragOver 
                            ? 'Drop your image here' 
                            : isNFT 
                              ? 'Upload your NFT artwork'
                              : 'Upload token icon'
                          }
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Drag and drop or click to browse
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PNG, JPG, or SVG • Max 1MB
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Image Preview */}
                    {imagePreview && (
                      <div className="flex justify-center">
                        <div className="relative">
                          <img
                            src={imagePreview}
                            alt="Preview"
                            className="w-32 h-32 object-cover rounded-lg border-2 border-border shadow-sm"
                          />
                          <div className="absolute -top-2 -right-2">
                            <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* File Info */}
                    <div className="flex items-center justify-between p-4 bg-muted/50 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <span className="text-primary">🖼️</span>
                        </div>
                        <div>
                          <p className="font-medium text-sm">{selectedFileName}</p>
                          <p className="text-xs text-muted-foreground">Image uploaded successfully</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          Change
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleFileChange(null, onChange)}
                          className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                        >
                          Remove
                        </Button>
                      </div>
                    </div>
                    

                  </div>
                )}
              </div>
            </FormControl>
            
            {/* Single hidden file input used by both drag-drop and change button */}
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                handleFileChange(file || null, onChange);
                // Reset the input value to allow selecting the same file again
                if (e.target) {
                  e.target.value = '';
                }
              }}
              className="hidden"
            />
            <FormMessage />
          </FormItem>
        )}
      />
    </>
  );
} 