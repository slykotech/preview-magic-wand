export interface EmailTemplate {
  subject: string;
  html: string;
  headers?: Record<string, string>;
}

export interface EmailSendOptions {
  to: string[];
  template: EmailTemplate;
  entityRefId?: string;
}

export interface ResendEmailResponse {
  success: boolean;
  data?: any;
  error?: {
    message: string;
    name?: string;
    statusCode?: number;
  };
}

export interface InvitationRequest {
  type: 'connect' | 'invite';
  email: string;
  senderName?: string;
}

export interface SignupInvitationRequest {
  email: string;
  inviterName?: string;
}

export interface VerificationRequest {
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}