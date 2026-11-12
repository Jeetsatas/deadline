export interface FolderNameValidation {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

export class ProjectValidationService {
  private static readonly RESERVED_NAMES = new Set([
    'CON',
    'PRN',
    'AUX',
    'NUL',
    'COM1',
    'LPT1',
    '.GIT',
    '.DS_STORE',
    'NODE_MODULES',
  ]);

  /**
   * Validates a folder name for new project creation.
   */
  static validateFolderName(name: string): FolderNameValidation {
    if (!name || typeof name !== 'string') {
      return { valid: false, error: 'Project folder name cannot be empty.' };
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return { valid: false, error: 'Project folder name cannot be empty.' };
    }

    if (trimmed.length > 100) {
      return { valid: false, error: 'Project folder name cannot exceed 100 characters.' };
    }

    // Reject path separators and traversal
    if (trimmed.includes('/') || trimmed.includes('\\') || trimmed.includes('..')) {
      return {
        valid: false,
        error: 'Project folder name cannot contain path separators or directory traversal.',
      };
    }

    // Reject null bytes or control characters
    for (let i = 0; i < trimmed.length; i++) {
      const code = trimmed.charCodeAt(i);
      if (code < 32 || code === 127) {
        return { valid: false, error: 'Project folder name contains invalid characters.' };
      }
    }

    // Check reserved names and hidden dotfiles
    const upper = trimmed.toUpperCase();
    if (trimmed.startsWith('.') || this.RESERVED_NAMES.has(upper)) {
      return { valid: false, error: `"${trimmed}" is a reserved or hidden system folder name.` };
    }

    // Produce safe sanitized version
    const sanitized = trimmed.replace(/[^a-zA-Z0-9_.\-\s]/g, '-');

    return { valid: true, sanitized };
  }

  /**
   * Validates destination path composition.
   */
  static validateDestinationPath(
    parentDirectory: string,
    folderName: string
  ): { valid: boolean; destinationPath?: string; error?: string } {
    if (!parentDirectory || !parentDirectory.trim()) {
      return { valid: false, error: 'Parent directory must be specified.' };
    }

    const folderCheck = this.validateFolderName(folderName);
    if (!folderCheck.valid) {
      return { valid: false, error: folderCheck.error };
    }

    const cleanParent = parentDirectory.replace(/\/+$/, '');
    const cleanFolder = folderCheck.sanitized || folderName.trim();
    const destinationPath = `${cleanParent}/${cleanFolder}`;

    // Basic sanity checks on destination
    if (destinationPath === cleanParent) {
      return { valid: false, error: 'Destination path equals parent directory.' };
    }

    return { valid: true, destinationPath };
  }
}
