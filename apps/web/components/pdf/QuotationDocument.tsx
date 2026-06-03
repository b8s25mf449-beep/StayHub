import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#000000',
    fontFamily: 'Helvetica',
    paddingHorizontal: 50,
    paddingTop: 50,
    paddingBottom: 80,
    color: '#ffffff',
  },
  header: {
    alignItems: 'center',
    marginBottom: 32,
  },
  hotelName: {
    fontSize: 9,
    color: '#888888',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  cotizacionTitle: {
    fontSize: 26,
    fontFamily: 'Helvetica-Bold',
    letterSpacing: 4,
    textTransform: 'uppercase',
    color: '#ffffff',
  },
  infoBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  infoLeft: { flex: 1 },
  infoRight: { flex: 1, alignItems: 'flex-end' },
  infoRow: {
    fontSize: 9,
    color: '#ffffff',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoLabel: {
    color: '#888888',
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.25)',
    marginVertical: 12,
  },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginVertical: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    marginBottom: 10,
  },
  colRoom: { flex: 2 },
  colNight: { flex: 1, alignItems: 'center' },
  colTotal: { flex: 1, alignItems: 'flex-end' },
  tableHeaderText: {
    fontSize: 8,
    color: '#666666',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  roomNameText: {
    fontSize: 11,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  priceNightText: {
    fontSize: 11,
    color: '#ffffff',
    textAlign: 'center',
  },
  priceTotalText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#e8a94a',
    textAlign: 'right',
  },
  amenityText: {
    fontSize: 9,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginTop: 4,
  },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 50,
    right: 50,
    alignItems: 'center',
  },
  footerLogo: {
    fontSize: 14,
    color: '#ffffff',
    letterSpacing: 10,
    fontFamily: 'Helvetica',
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  footerContact: {
    fontSize: 8,
    color: '#888888',
    marginTop: 3,
    letterSpacing: 0.5,
  },
});

interface QuotationData {
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
  guestName: string;
  adultsCount: number;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  roomName: string;
  roomNumber: string;
  pricePerNight: number;
  subtotal: number;
  requiresInvoice: boolean;
  iva: number;
  totalWithTax: number;
}

function fmt(amount: number): string {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function fmtDateRange(checkIn: string, checkOut: string): string {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  if (m1 === m2 && y1 === y2) {
    return `${d1} - ${d2} ${months[m1 - 1]} ${y1}`;
  }
  return `${d1} ${months[m1 - 1]} - ${d2} ${months[m2 - 1]} ${y1}`;
}

export function QuotationDocument(props: QuotationData) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          <Text style={styles.hotelName}>{props.tenantName}</Text>
          <Text style={styles.cotizacionTitle}>Cotización</Text>
        </View>

        {/* INFO BLOCK */}
        <View style={styles.infoBlock}>
          <View style={styles.infoLeft}>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fecha:  </Text>
              {fmtDateRange(props.checkInDate, props.checkOutDate)}
            </Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Noches:  </Text>
              {props.nights}
            </Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Huésped:  </Text>
              {props.guestName} · {props.adultsCount} adulto{props.adultsCount !== 1 ? 's' : ''}
            </Text>
          </View>
          <View style={styles.infoRight}>
            <Text style={styles.infoRow}>Desayuno incluido</Text>
            {props.requiresInvoice && (
              <>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Impuestos (21%):  </Text>
                  {fmt(props.iva)}
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total con impuestos:  </Text>
                  {fmt(props.totalWithTax)}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* DIVIDER + RESERVA */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>Reserva</Text>
        <View style={styles.divider} />

        {/* TABLE HEADER */}
        <View style={styles.tableHeader}>
          <View style={styles.colRoom}>
            <Text style={styles.tableHeaderText}>Habitación</Text>
          </View>
          <View style={styles.colNight}>
            <Text style={styles.tableHeaderText}>Precio x noche</Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={styles.tableHeaderText}>Precio total</Text>
          </View>
        </View>

        {/* TABLE ROW */}
        <View style={styles.tableRow}>
          <View style={styles.colRoom}>
            <Text style={styles.roomNameText}>
              {props.roomName} (Hab. {props.roomNumber})
            </Text>
            <Text style={styles.amenityText}>Desayuno incluido</Text>
          </View>
          <View style={styles.colNight}>
            <Text style={styles.priceNightText}>{fmt(props.pricePerNight)}</Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={styles.priceTotalText}>{fmt(props.subtotal)}</Text>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          <Text style={styles.footerLogo}>{props.tenantName.toUpperCase()}</Text>
          <View style={styles.divider} />
          {props.tenantPhone ? <Text style={styles.footerContact}>{props.tenantPhone}</Text> : null}
          {props.tenantAddress ? <Text style={styles.footerContact}>{props.tenantAddress}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
