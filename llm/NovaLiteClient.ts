import { createHash, createHmac } from 'crypto';

export interface NovaLiteClientOptions {
  region?: string;
  modelId?: string;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
  endpoint?: string;
}

/**
 * Minimal AWS SigV4 client that can invoke Amazon Nova Lite via the Bedrock
 * runtime HTTPS API. The implementation keeps dependencies light so it can run
 * in restricted CI environments where the official AWS SDK might not be
 * available.
 */
export class NovaLiteClient {
  private readonly region: string;
  private readonly modelId: string;
  private readonly maxTokens: number;
  private readonly temperature: number;
  private readonly topP: number;
  private readonly accessKeyId?: string;
  private readonly secretAccessKey?: string;
  private readonly sessionToken?: string;
  private readonly endpoint?: string;

  constructor(options: NovaLiteClientOptions = {}) {
    this.region = options.region ?? process.env.NOVA_LITE_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    this.modelId = options.modelId ?? process.env.NOVA_LITE_MODEL_ID ?? 'amazon.nova-lite-v1:0';
    this.maxTokens = options.maxTokens ?? 512;
    this.temperature = options.temperature ?? 0.2;
    this.topP = options.topP ?? 0.9;
    this.accessKeyId = options.accessKeyId ?? process.env.AWS_ACCESS_KEY_ID;
    this.secretAccessKey = options.secretAccessKey ?? process.env.AWS_SECRET_ACCESS_KEY;
    this.sessionToken = options.sessionToken ?? process.env.AWS_SESSION_TOKEN;
    this.endpoint = options.endpoint;
  }

  async complete(prompt: string): Promise<string> {
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('Missing AWS credentials for Nova Lite invocation');
    }

    const body = JSON.stringify({
      inputText: prompt,
      textGenerationConfig: {
        maxTokenCount: this.maxTokens,
        temperature: this.temperature,
        topP: this.topP
      }
    });

    const endpoint =
      this.endpoint ?? `https://bedrock-runtime.${this.region}.amazonaws.com/model/${this.modelId}/invoke`;
    const headers = this.buildSignedHeaders(endpoint, body);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Nova Lite invocation failed: ${response.status} ${errorText}`);
    }

    const payload = await response.json();
    if (Array.isArray(payload.outputText)) {
      return payload.outputText.map((entry: { text?: string }) => entry?.text ?? '').join('').trim();
    }

    if (Array.isArray(payload.results)) {
      return payload.results.map((entry: { outputText?: string }) => entry?.outputText ?? '').join('').trim();
    }

    return payload.outputText?.[0]?.text?.trim() ?? '';
  }

  private buildSignedHeaders(endpoint: string, body: string): Record<string, string> {
    const url = new URL(endpoint);
    const host = url.host;
    const now = new Date();
    const amzDate = this.formatAmzDate(now);
    const dateStamp = amzDate.slice(0, 8);

    const canonicalQuerystring = this.buildCanonicalQuerystring(url);
    const headers: Record<string, string> = {
      'content-type': 'application/json',
      host,
      'x-amz-date': amzDate
    };

    if (this.sessionToken) {
      headers['x-amz-security-token'] = this.sessionToken;
    }

    const normalizedHeaders: Record<string, string> = {};
    Object.entries(headers).forEach(([key, value]) => {
      normalizedHeaders[key.toLowerCase()] = value;
    });

    const signedHeadersList = Object.keys(normalizedHeaders).sort();
    const canonicalHeaders = signedHeadersList
      .map((key) => `${key}:${normalizedHeaders[key]}`)
      .join('\n');

    const signedHeaders = signedHeadersList.join(';');
    const payloadHash = createHash('sha256').update(body, 'utf8').digest('hex');
    const canonicalRequest = [
      'POST',
      url.pathname,
      canonicalQuerystring,
      `${canonicalHeaders}\n`,
      signedHeaders,
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/${this.region}/bedrock/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest, 'utf8').digest('hex')
    ].join('\n');

    const signingKey = this.getSignatureKey(dateStamp);
    const signature = createHmac('sha256', signingKey).update(stringToSign, 'utf8').digest('hex');

    headers.Authorization =
      `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return headers;
  }

  private buildCanonicalQuerystring(url: URL): string {
    const entries: [string, string][] = [];
    url.searchParams.forEach((value, key) => {
      entries.push([key, value]);
    });
    entries.sort(([a], [b]) => a.localeCompare(b));
    return entries
      .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(value)}`)
      .join('&');
  }

  private getSignatureKey(dateStamp: string): Buffer {
    if (!this.secretAccessKey) {
      throw new Error('Missing AWS secret for Nova Lite invocation');
    }

    const kDate = createHmac('sha256', `AWS4${this.secretAccessKey}`).update(dateStamp, 'utf8').digest();
    const kRegion = createHmac('sha256', kDate).update(this.region, 'utf8').digest();
    const kService = createHmac('sha256', kRegion).update('bedrock', 'utf8').digest();
    return createHmac('sha256', kService).update('aws4_request', 'utf8').digest();
  }

  private formatAmzDate(date: Date): string {
    const pad = (value: number) => value.toString().padStart(2, '0');
    return (
      date.getUTCFullYear().toString() +
      pad(date.getUTCMonth() + 1) +
      pad(date.getUTCDate()) +
      'T' +
      pad(date.getUTCHours()) +
      pad(date.getUTCMinutes()) +
      pad(date.getUTCSeconds()) +
      'Z'
    );
  }
}
