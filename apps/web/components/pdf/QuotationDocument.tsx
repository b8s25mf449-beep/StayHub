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
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingBottom: 10,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  tableRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
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
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 9,
    color: '#888888',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  totalValue: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#e8a94a',
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

export interface QuotationRoom {
  roomName: string;
  adults: number;
  children: number;
  pricePerNight: number;
  subtotal: number;
}

export interface QuotationData {
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rooms: QuotationRoom[];
  grandSubtotal: number;
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
  const totalAdults = props.rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = props.rooms.reduce((s, r) => s + r.children, 0);

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
              {props.guestName}
            </Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Huéspedes:  </Text>
              {totalAdults} adulto{totalAdults !== 1 ? 's' : ''}
              {totalChildren > 0 ? `, ${totalChildren} niño${totalChildren !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          <View style={styles.infoRight}>
            <Text style={styles.infoRow}>Desayuno incluido</Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Habitaciones:  </Text>
              {props.rooms.length}
            </Text>
            {props.requiresInvoice && (
              <>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>IVA (21%):  </Text>
                  {fmt(props.iva)}
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total c/factura:  </Text>
                  {fmt(props.totalWithTax)}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* DIVIDER + RESERVA */}
        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>
          {props.rooms.length === 1 ? 'Reserva' : `Reserva · ${props.rooms.length} habitaciones`}
        </Text>
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

        {/* TABLE ROWS — one per room */}
        {props.rooms.map((room, idx) => (
          <View
            key={idx}
            style={idx < props.rooms.length - 1 ? styles.tableRow : styles.tableRowLast}
          >
            <View style={styles.colRoom}>
              <Text style={styles.roomNameText}>{room.roomName}</Text>
              <Text style={styles.amenityText}>
                {room.adults} adulto{room.adults !== 1 ? 's' : ''}
                {room.children > 0 ? ` · ${room.children} niño${room.children !== 1 ? 's' : ''}` : ''}
                {'  ·  Desayuno incluido'}
              </Text>
            </View>
            <View style={styles.colNight}>
              <Text style={styles.priceNightText}>{fmt(room.pricePerNight)}</Text>
            </View>
            <View style={styles.colTotal}>
              <Text style={styles.priceTotalText}>{fmt(room.subtotal)}</Text>
            </View>
          </View>
        ))}

        {/* GRAND TOTAL */}
        {props.rooms.length > 1 && (
          <>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total reserva</Text>
              <Text style={styles.totalValue}>{fmt(props.grandSubtotal)}</Text>
            </View>
          </>
        )}

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
