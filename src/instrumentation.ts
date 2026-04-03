import { registerOTel, OTLPHttpJsonTraceExporter } from '@vercel/otel';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.ERROR);

export function register() {
  registerOTel({
    serviceName: process.env.OTEL_SERVICE_NAME || 'nextjs-app',
    traceExporter: new OTLPHttpJsonTraceExporter({
      url: process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT || 'https://ingest.us.signoz.cloud:443/v1/traces',
      headers: process.env.SIGNOZ_INGESTION_KEY
        ? { 'signoz-ingestion-key': process.env.SIGNOZ_INGESTION_KEY }
        : undefined,
    }),
  });
}
