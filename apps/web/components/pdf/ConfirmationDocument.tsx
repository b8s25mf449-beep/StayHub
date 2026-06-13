import { Document, Page, View, Text, Image, StyleSheet } from '@react-pdf/renderer';

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
    marginBottom: 28,
  },
  logoImg: {
    width: 130,
    height: 130,
    objectFit: 'contain',
    marginBottom: 6,
  },
  confirmTitle: {
    fontSize: 9,
    color: '#888888',
    letterSpacing: 4,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  badge: {
    backgroundColor: '#0f766e',
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
    fontFamily: 'Helvetica-Bold',
  },
  divider: {
    borderTopWidth: 0.5,
    borderTopColor: 'rgba(255,255,255,0.15)',
    marginVertical: 14,
  },
  infoBlock: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  infoLeft:  { flex: 1 },
  infoRight: { flex: 1, alignItems: 'flex-end' },
  infoRow: {
    fontSize: 9,
    color: '#ffffff',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  infoLabel: { color: '#888888' },
  sectionTitle: {
    textAlign: 'center',
    fontSize: 9,
    color: '#ffffff',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginVertical: 10,
  },
  tableHeader: { flexDirection: 'row', marginBottom: 8 },
  colRoom:  { flex: 2 },
  colNight: { flex: 1, alignItems: 'center' },
  colTotal: { flex: 1, alignItems: 'flex-end' },
  tableHeaderText: {
    fontSize: 8,
    color: '#555555',
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
  roomNameText:  { fontSize: 11, color: '#ffffff', textTransform: 'uppercase' },
  amenityText:   { fontSize: 9, color: '#888888', textTransform: 'uppercase', letterSpacing: 0.8, marginTop: 4 },
  priceNightText: { fontSize: 11, color: '#ffffff', textAlign: 'center' },
  priceTotalText: {
    fontSize: 14,
    fontFamily: 'Helvetica-Bold',
    color: '#e8a94a',
    textAlign: 'right',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  totalLabel: { fontSize: 9, color: '#888888', textTransform: 'uppercase', letterSpacing: 1 },
  totalValue: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: '#e8a94a' },
  notesBox: {
    marginTop: 16,
    padding: 12,
    borderWidth: 0.5,
    borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 4,
  },
  notesLabel: { fontSize: 8, color: '#666666', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 },
  notesText:  { fontSize: 9, color: '#aaaaaa', lineHeight: 1.5 },
  footer: {
    position: 'absolute',
    bottom: 32,
    left: 50,
    right: 50,
    alignItems: 'center',
  },
  footerLogoImg: {
    width: 154,
    height: 154,
    objectFit: 'contain',
    marginBottom: 4,
  },
  footerLogoText: {
    fontSize: 12,
    color: '#ffffff',
    letterSpacing: 8,
    fontFamily: 'Helvetica',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  footerContact: { fontSize: 8, color: '#555555', marginTop: 3, letterSpacing: 0.5 },
});

export interface ConfirmationRoom {
  roomName: string;
  adults: number;
  children: number;
  pricePerNight: number;
  subtotal: number;
}

export interface ConfirmationData {
  tenantName: string;
  tenantPhone: string;
  tenantAddress: string;
  logoBase64?: string;
  guestName: string;
  checkInDate: string;
  checkOutDate: string;
  nights: number;
  rooms: ConfirmationRoom[];
  grandSubtotal: number;
  requiresInvoice: boolean;
  iva: number;
  totalWithTax: number;
  notes?: string;
  confirmationNumber?: string;
}

function fmt(amount: number): string {
  return `$${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

function fmtDateRange(checkIn: string, checkOut: string): string {
  const [y1, m1, d1] = checkIn.split('-').map(Number);
  const [y2, m2, d2] = checkOut.split('-').map(Number);
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  if (m1 === m2 && y1 === y2) return `${d1} - ${d2} ${months[m1 - 1]} ${y1}`;
  return `${d1} ${months[m1 - 1]} - ${d2} ${months[m2 - 1]} ${y1}`;
}

export function ConfirmationDocument(props: ConfirmationData) {
  const totalAdults   = props.rooms.reduce((s, r) => s + r.adults, 0);
  const totalChildren = props.rooms.reduce((s, r) => s + r.children, 0);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* HEADER */}
        <View style={styles.header}>
          {props.logoBase64 ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={props.logoBase64} style={styles.logoImg} />
          ) : (
            <Text style={{ ...styles.confirmTitle, fontSize: 16, color: '#ffffff', letterSpacing: 8, marginBottom: 12 }}>
              {props.tenantName.toUpperCase()}
            </Text>
          )}
          <Text style={styles.confirmTitle}>Confirmación de Reserva</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>CONFIRMADA</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* INFO BLOCK */}
        <View style={styles.infoBlock}>
          <View style={styles.infoLeft}>
            {props.confirmationNumber && (
              <Text style={styles.infoRow}>
                <Text style={styles.infoLabel}># Confirmación  </Text>
                {props.confirmationNumber}
              </Text>
            )}
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Huésped  </Text>
              {props.guestName}
            </Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Fechas  </Text>
              {fmtDateRange(props.checkInDate, props.checkOutDate)}
            </Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Noches  </Text>
              {props.nights}
            </Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Huéspedes  </Text>
              {totalAdults} adulto{totalAdults !== 1 ? 's' : ''}
              {totalChildren > 0 ? `, ${totalChildren} niño${totalChildren !== 1 ? 's' : ''}` : ''}
            </Text>
          </View>
          <View style={styles.infoRight}>
            <Text style={styles.infoRow}>Desayuno incluido</Text>
            <Text style={styles.infoRow}>Estacionamiento gratuito</Text>
            <Text style={styles.infoRow}>
              <Text style={styles.infoLabel}>Habitaciones  </Text>
              {props.rooms.length}
            </Text>
            {props.requiresInvoice && (
              <>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>IVA (21%)  </Text>
                  {fmt(props.iva)}
                </Text>
                <Text style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Total c/factura  </Text>
                  {fmt(props.totalWithTax)}
                </Text>
              </>
            )}
          </View>
        </View>

        <View style={styles.divider} />
        <Text style={styles.sectionTitle}>
          {props.rooms.length === 1 ? 'Detalle de reserva' : `Detalle · ${props.rooms.length} habitaciones`}
        </Text>
        <View style={styles.divider} />

        {/* TABLE */}
        <View style={styles.tableHeader}>
          <View style={styles.colRoom}>
            <Text style={styles.tableHeaderText}>Habitación</Text>
          </View>
          <View style={styles.colNight}>
            <Text style={styles.tableHeaderText}>Precio x noche</Text>
          </View>
          <View style={styles.colTotal}>
            <Text style={styles.tableHeaderText}>Total</Text>
          </View>
        </View>

        {props.rooms.map((room, idx) => (
          <View key={idx} style={idx < props.rooms.length - 1 ? styles.tableRow : styles.tableRowLast}>
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

        {props.rooms.length > 1 && (
          <>
            <View style={styles.divider} />
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total reserva</Text>
              <Text style={styles.totalValue}>{fmt(props.grandSubtotal)}</Text>
            </View>
          </>
        )}

        {props.notes && (
          <View style={styles.notesBox}>
            <Text style={styles.notesLabel}>Notas</Text>
            <Text style={styles.notesText}>{props.notes}</Text>
          </View>
        )}

        {/* FOOTER */}
        <View style={styles.footer}>
          <View style={styles.divider} />
          {props.logoBase64 ? (
            // eslint-disable-next-line jsx-a11y/alt-text
            <Image src={props.logoBase64} style={styles.footerLogoImg} />
          ) : (
            <Text style={styles.footerLogoText}>{props.tenantName.toUpperCase()}</Text>
          )}
          <View style={styles.divider} />
          {props.tenantPhone   ? <Text style={styles.footerContact}>{props.tenantPhone}</Text>   : null}
          {props.tenantAddress ? <Text style={styles.footerContact}>{props.tenantAddress}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
