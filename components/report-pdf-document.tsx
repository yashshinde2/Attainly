'use client'

import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { ReportTableResult } from '@/lib/report-types'

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Helvetica',
    fontSize: 9,
    color: '#1e293b',
  },
  header: {
    borderBottomWidth: 1.5,
    borderBottomColor: '#0f172a',
    paddingBottom: 8,
    marginBottom: 14,
  },
  brand: {
    fontSize: 9,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  title: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 4,
  },
  subtitle: {
    fontSize: 9,
    color: '#475569',
    marginTop: 3,
  },
  meta: {
    fontSize: 8,
    color: '#64748b',
    marginTop: 4,
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  tableRowHeader: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderBottomWidth: 1,
    borderBottomColor: '#cbd5e1',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e2e8f0',
  },
  cellHeader: {
    flex: 1,
    padding: 6,
    fontFamily: 'Helvetica-Bold',
    fontSize: 8,
    color: '#0f172a',
  },
  cell: {
    flex: 1,
    padding: 6,
    fontSize: 8,
    color: '#334155',
  },
  empty: {
    padding: 16,
    textAlign: 'center',
    color: '#64748b',
    fontSize: 9,
  },
})

export function ReportPdfDocument({ result }: { result: ReportTableResult }) {
  return (
    <Document>
      <Page size="A4" orientation={result.columns.length > 4 ? 'landscape' : 'portrait'} style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.brand}>Attainly Institutional Report</Text>
          <Text style={styles.title}>{result.title}</Text>
          <Text style={styles.subtitle}>{result.subtitle}</Text>
          <Text style={styles.meta}>
            Generated: {new Date(result.generatedAt).toLocaleString()} • Total rows: {result.rows.length}
          </Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableRowHeader}>
            {result.columns.map((col) => (
              <Text key={col.key} style={styles.cellHeader}>
                {col.label}
              </Text>
            ))}
          </View>
          {result.rows.length === 0 ? (
            <Text style={styles.empty}>No records matched the selected filters.</Text>
          ) : (
            result.rows.map((row, idx) => (
              <View key={idx} style={styles.tableRow} wrap={false}>
                {result.columns.map((col) => (
                  <Text key={col.key} style={styles.cell}>
                    {row[col.key] !== undefined && row[col.key] !== null ? String(row[col.key]) : ''}
                  </Text>
                ))}
              </View>
            ))
          )}
        </View>
      </Page>
    </Document>
  )
}
