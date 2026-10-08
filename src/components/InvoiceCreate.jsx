import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Building,
  User,
  Calendar,
  IndianRupee,
  Save,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  X,
  Truck,
  MapPin
} from 'lucide-react';
import { invoiceService, itemService, userService } from '../services/api';
import { formatDateDDMMYYYY, toISODate, getTodayISODate } from '../utils/date';
import { INDIAN_STATES, getStateCode } from '../utils/states';

// Single Searchable Combobox Component for Customers / Clients
function SearchableCustomerSelect({
  customerName,
  selectedUserId,
  userList,
  onSelectUser,
  onChangeCustomerName,
  onClear
}) {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = React.useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter users based on input value
  const selectedUser = (userList || []).find((u) => String(u.id) === String(selectedUserId));
  const isExactSelected = selectedUser && selectedUser.name.toLowerCase() === (customerName || '').trim().toLowerCase();

  const filteredUsers = (userList || []).filter((u) => {
    // If the input matches the currently selected user exactly, show all clients so user can easily switch
    if (isExactSelected) return true;
    const q = (customerName || '').trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (u.name || '').toLowerCase().includes(q);
    const stateMatch = (u.state || '').toLowerCase().includes(q);
    const cityMatch = (u.city || '').toLowerCase().includes(q);
    const phoneMatch = (u.contactNumber || '').includes(q);
    const gstinMatch = (u.gstNumber || u.gstin || (u.pincode && u.pincode.length > 6 ? u.pincode : '') || '').toLowerCase().includes(q);
    return nameMatch || stateMatch || cityMatch || phoneMatch || gstinMatch;
  });

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Main Combobox Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          required
          placeholder="Search or select client..."
          value={customerName || ''}
          onChange={(e) => {
            onChangeCustomerName(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onClick={() => setIsOpen(true)}
          className="w-full h-10 pl-3.5 pr-14 border border-slate-200 rounded-xl text-sm font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400 shadow-2xs transition-all"
        />

        <div className="absolute right-1.5 flex items-center space-x-0.5">
          {customerName && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onClear();
              }}
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors cursor-pointer"
            title="Browse clients"
            tabIndex={-1}
          >
            <ChevronDown
              className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''
                }`}
            />
          </button>
        </div>
      </div>

      {/* Sleek Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden text-xs">
          <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
            <span>Clients ({filteredUsers.length})</span>
            {customerName && !isExactSelected && (
              <span className="text-indigo-600 lowercase font-medium">filter: "{customerName}"</span>
            )}
          </div>

          {/* Client List */}
          <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
            {filteredUsers.length > 0 ? (
              filteredUsers.map((u) => {
                const isSelected =
                  (selectedUserId && String(selectedUserId) === String(u.id)) ||
                  (customerName && customerName.trim().toLowerCase() === (u.name || '').trim().toLowerCase());

                return (
                  <div
                    key={u.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      onSelectUser(u);
                      setIsOpen(false);
                    }}
                    className={`p-2.5 transition-colors flex items-center justify-between cursor-pointer ${isSelected
                      ? 'bg-indigo-50/90 font-semibold'
                      : 'hover:bg-slate-50'
                      }`}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-slate-900 font-semibold truncate flex items-center space-x-2">
                        <span className="truncate text-xs">{u.name}</span>
                        {u.state && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100 flex-shrink-0">
                            {u.state}
                          </span>
                        )}
                        {u.city && (
                          <span className="text-[10px] text-slate-500 font-normal">
                            ({u.city})
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center space-x-3 truncate">
                        {u.contactNumber && (
                          <span>Phone: <strong className="text-slate-700">{u.contactNumber}</strong></span>
                        )}
                        {(u.gstNumber || u.gstin || (u.pincode && u.pincode.length > 6 ? u.pincode : '')) && (
                          <span className="font-mono">GSTIN: <strong className="text-slate-700">{u.gstNumber || u.gstin || u.pincode}</strong></span>
                        )}
                      </div>
                    </div>

                    {isSelected && (
                      <div className="p-1 rounded-full bg-indigo-600 text-white flex-shrink-0">
                        <Check className="w-3 h-3" />
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="p-4 text-center text-slate-500 space-y-1">
                <p className="text-xs">No saved clients match "{customerName}"</p>
                <p className="text-[11px] text-slate-400">
                  You can proceed with "{customerName}" as a custom client name.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Single Searchable Dropdown Component for Catalog Items
function SearchableItemSelect({ row, index, allItems, catalogItems, onSelectItem, onChangeName }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const wrapperRef = React.useRef(null);
  const searchInputRef = React.useRef(null);

  // Click outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus search input when dropdown opens
  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  // Check if item is already picked in another row
  const isItemAlreadySelected = (ci) => {
    return (allItems || []).some(
      (it, idx) =>
        idx !== index &&
        ((it.itemId && String(it.itemId) === String(ci.id)) ||
          (it.itemName &&
            ci.name &&
            it.itemName.trim().toLowerCase() === ci.name.trim().toLowerCase()))
    );
  };

  const filteredItems = (catalogItems || []).filter((ci) => {
    const q = (searchTerm || '').trim().toLowerCase();
    if (!q) return true;
    const nameMatch = (ci.name || '').toLowerCase().includes(q);
    const hsnMatch = (ci.hsnSac || '').toLowerCase().includes(q);
    return nameMatch || hsnMatch;
  });

  return (
    <div className="relative" ref={wrapperRef}>
      {/* Single Field for Display & Direct Input */}
      <div className="relative flex items-center">
        <input
          type="text"
          required
          placeholder="Search or select item..."
          value={row.itemName || ''}
          onChange={(e) => {
            onChangeName(index, e.target.value);
          }}
          onClick={() => setIsOpen(true)}
          className="w-full h-9 pl-2.5 pr-8 text-xs border border-slate-200 rounded-lg font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none placeholder:text-slate-400"
        />
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="absolute right-1 p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          title="Browse & search items"
          tabIndex={-1}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
          />
        </button>
      </div>

      {/* Searchable Dropdown Popover */}
      {isOpen && (
        <div className="absolute left-0 top-full mt-1 w-72 sm:w-80 bg-white border border-slate-200 rounded-xl shadow-2xl z-50 overflow-hidden text-xs">
          {/* Search box inside dropdown */}
          <div className="p-2 border-b border-slate-100 bg-slate-50">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Search by item name or HSN..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Catalog Items List */}
          <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
            {filteredItems.length > 0 ? (
              filteredItems.map((ci) => {
                const isSelected =
                  String(row.itemId) === String(ci.id) ||
                  (row.itemName && row.itemName.trim().toLowerCase() === (ci.name || '').trim().toLowerCase());
                const alreadySelected = isItemAlreadySelected(ci);

                return (
                  <div
                    key={ci.id}
                    onClick={() => {
                      if (alreadySelected) return;
                      onSelectItem(index, ci.id);
                      setIsOpen(false);
                      setSearchTerm('');
                    }}
                    className={`p-2.5 transition-colors flex items-center justify-between ${alreadySelected
                      ? 'opacity-40 bg-slate-100/70 cursor-not-allowed select-none'
                      : isSelected
                        ? 'bg-indigo-50/70 font-semibold cursor-pointer'
                        : 'hover:bg-indigo-50/70 cursor-pointer'
                      }`}
                    title={alreadySelected ? `"${ci.name}" is already added in another row` : ''}
                  >
                    <div className="min-w-0 pr-2">
                      <div className="text-slate-900 font-medium truncate flex items-center space-x-1.5">
                        <span className={`truncate ${alreadySelected ? 'text-slate-500 line-through decoration-slate-300' : ''}`}>
                          {ci.name}
                        </span>
                        {alreadySelected ? (
                          <span className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300 flex-shrink-0">
                            Already Added
                          </span>
                        ) : (
                          ci.hsnSac && (
                            <span className="text-[10px] font-mono px-1 py-0.2 bg-slate-100 text-slate-600 rounded flex-shrink-0">
                              HSN: {ci.hsnSac}
                            </span>
                          )
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Rate: <strong className="text-slate-800">₹{ci.pricePerUnit}</strong> / {ci.unit || 'Pcs'} • GST:{' '}
                        <strong className="text-indigo-600">{ci.gstRate}%</strong>
                      </div>
                    </div>
                    {alreadySelected ? (
                      <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                        Added
                      </span>
                    ) : isSelected ? (
                      <Check className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                    ) : null}
                  </div>
                );
              })
            ) : (
              <div className="p-3 text-center text-slate-400 text-xs">
                No catalog items match "{searchTerm}"
              </div>
            )}
          </div>

          {/* Option to apply typed search as custom item */}
          {searchTerm.trim() &&
            !filteredItems.some(
              (ci) => (ci.name || '').toLowerCase() === searchTerm.trim().toLowerCase()
            ) && (
              (() => {
                const customAlreadyUsed = (allItems || []).some(
                  (it, idx) =>
                    idx !== index &&
                    (it.itemName || '').trim().toLowerCase() === searchTerm.trim().toLowerCase()
                );

                if (customAlreadyUsed) {
                  return (
                    <div className="p-2 border-t border-slate-100 bg-amber-50/60 text-amber-800 text-[11px] flex items-center space-x-1.5 cursor-not-allowed">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                      <span className="truncate">"{searchTerm.trim()}" is already added on another line</span>
                    </div>
                  );
                }

                return (
                  <div
                    onClick={() => {
                      onChangeName(index, searchTerm.trim());
                      setIsOpen(false);
                    }}
                    className="p-2 border-t border-slate-100 bg-slate-50 hover:bg-slate-100 cursor-pointer text-indigo-600 font-medium text-xs flex items-center space-x-1.5"
                  >
                    <Plus className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate">Use "{searchTerm.trim()}" as item name</span>
                  </div>
                );
              })()
            )}
        </div>
      )}
    </div>
  );
}

// Guaranteed DD/MM/YYYY Formatted Date Input with Native Picker Popover
function DateInputDDMMYYYY({ value, onChange, className }) {
  const hiddenDateRef = React.useRef(null);
  const [inputText, setInputText] = useState(() => formatDateDDMMYYYY(value));

  useEffect(() => {
    setInputText(formatDateDDMMYYYY(value));
  }, [value]);

  const handleTextChange = (e) => {
    const raw = e.target.value;
    setInputText(raw);

    const clean = raw.replace(/-/g, '/');
    const match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const [, d, m, y] = match;
      const dNum = parseInt(d, 10);
      const mNum = parseInt(m, 10);
      const yNum = parseInt(y, 10);
      if (dNum >= 1 && dNum <= 31 && mNum >= 1 && mNum <= 12 && yNum >= 2000 && yNum <= 2099) {
        onChange(`${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
      }
    }
  };

  const handleBlur = () => {
    setInputText(formatDateDDMMYYYY(value));
  };

  const handleCalendarPick = (e) => {
    const isoVal = e.target.value;
    if (isoVal) {
      onChange(isoVal);
      setInputText(formatDateDDMMYYYY(isoVal));
    }
  };

  const openPicker = () => {
    if (hiddenDateRef.current) {
      if (typeof hiddenDateRef.current.showPicker === 'function') {
        hiddenDateRef.current.showPicker();
      } else {
        hiddenDateRef.current.focus();
        hiddenDateRef.current.click();
      }
    }
  };

  return (
    <div className="relative flex items-center w-full">
      <input
        type="text"
        required
        placeholder="DD/MM/YYYY"
        value={inputText}
        onChange={handleTextChange}
        onBlur={handleBlur}
        className={`${className} pr-8 font-medium`}
      />
      <input
        ref={hiddenDateRef}
        type="date"
        value={toISODate(value) || ''}
        onChange={handleCalendarPick}
        className="sr-only"
        tabIndex={-1}
      />
      <button
        type="button"
        onClick={openPicker}
        className="absolute right-2.5 p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors cursor-pointer"
        title="Open Calendar"
        tabIndex={-1}
      >
        <Calendar className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export default function InvoiceCreate({ companySetting, onInvoiceCreated, onCancel }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [userList, setUserList] = useState([]);
  const [catalogItems, setCatalogItems] = useState([]);
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState('');

  // Invoice header state - Buyer (Bill to)
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerState, setCustomerState] = useState('');
  const [customerCity, setCustomerCity] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [customerGstin, setCustomerGstin] = useState('');

  // Consignee (Ship to) state
  const [sameAsBillTo, setSameAsBillTo] = useState(true);
  const [shippingName, setShippingName] = useState('');
  const [shippingAddress, setShippingAddress] = useState('');
  const [shippingCity, setShippingCity] = useState('');
  const [shippingState, setShippingState] = useState('');
  const [shippingGstin, setShippingGstin] = useState('');
  const [shippingPhone, setShippingPhone] = useState('');

  // Dispatch / Transport / Reference metadata fields
  const [showDispatchFields, setShowDispatchFields] = useState(false);
  const [deliveryNote, setDeliveryNote] = useState('');
  const [modeTermsOfPayment, setModeTermsOfPayment] = useState('');
  const [referenceNoDate, setReferenceNoDate] = useState('');
  const [otherReferences, setOtherReferences] = useState('');
  const [buyersOrderNo, setBuyersOrderNo] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [dispatchDocNo, setDispatchDocNo] = useState('');
  const [deliveryNoteDate, setDeliveryNoteDate] = useState('');
  const [dispatchedThrough, setDispatchedThrough] = useState('');
  const [destination, setDestination] = useState('');
  const [termsOfDelivery, setTermsOfDelivery] = useState('');

  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [status, setStatus] = useState('PENDING');
  const [notes, setNotes] = useState('Payment is requested within 15 days of invoice date. Thank you for your business.');

  // Invoice Items
  const [items, setItems] = useState([
    {
      id: Date.now(),
      itemId: '',
      itemName: '',
      hsnSac: '',
      qty: 1,
      unit: 'Pcs',
      pricePerUnit: 0,
      gstRate: 18
    }
  ]);

  // Load initial data (catalog items, next number)
  useEffect(() => {
    async function loadData() {
      try {
        const [itemsRes, nextNumRes] = await Promise.all([
          itemService.getAll(),
          invoiceService.getNextNumber()
        ]);

        if (itemsRes.data.success) {
          setCatalogItems(itemsRes.data.data);
        }

        if (nextNumRes.data.success) {
          setNextInvoiceNumber(nextNumRes.data.data.nextInvoiceNumber);
        }
      } catch (err) {
        console.error('Failed to load invoice creation prerequisites:', err);
      }
    }
    loadData();
  }, []);

  const handleSelectUser = (user) => {
    setSelectedUserId(user.id);
    setCustomerName(user.name);
    setCustomerState(user.state || '');
    setCustomerCity(user.city || '');
    setCustomerAddress(user.fullAddress || '');
    setCustomerPhone(user.contactNumber || '');
    setCustomerEmail(user.email || '');
    const gst = user.gstNumber || user.gstin || (user.pincode && user.pincode.length > 6 ? user.pincode : '') || '';
    setCustomerGstin(gst);

    if (sameAsBillTo) {
      setShippingName(user.name);
      setShippingState(user.state || '');
      setShippingCity(user.city || '');
      setShippingAddress(user.fullAddress || '');
      setShippingPhone(user.contactNumber || '');
      setShippingGstin(gst);
    }
  };

  const handleClearUser = () => {
    setSelectedUserId('');
    setCustomerName('');
    setCustomerState('');
    setCustomerCity('');
    setCustomerAddress('');
    setCustomerPhone('');
    setCustomerEmail('');
    setCustomerGstin('');

    if (sameAsBillTo) {
      setShippingName('');
      setShippingState('');
      setShippingCity('');
      setShippingAddress('');
      setShippingPhone('');
      setShippingGstin('');
    }
  };

  // Determine State Match
  const effectiveCustomerState = (customerState || companySetting?.state || 'Gujarat').trim();
  const companyStateClean = (companySetting?.state || 'Gujarat').trim().toLowerCase();
  const customerStateClean = effectiveCustomerState.toLowerCase();
  const isSameState = Boolean(companyStateClean && customerStateClean && companyStateClean === customerStateClean);

  // Compute row-level calculations
  const computedRows = items.map((row) => {
    const qty = Number(row.qty) || 0;
    const price = Number(row.pricePerUnit) || 0;
    const taxable = Number((qty * price).toFixed(2));
    const rate = Number(row.gstRate) || 0;

    let cgstRate = 0;
    let cgstAmount = 0;
    let sgstRate = 0;
    let sgstAmount = 0;
    let igstRate = 0;
    let igstAmount = 0;

    if (isSameState) {
      cgstRate = Number((rate / 2).toFixed(2));
      sgstRate = Number((rate / 2).toFixed(2));
      cgstAmount = Number(((taxable * cgstRate) / 100).toFixed(2));
      sgstAmount = Number(((taxable * sgstRate) / 100).toFixed(2));
    } else {
      igstRate = rate;
      igstAmount = Number(((taxable * igstRate) / 100).toFixed(2));
    }

    const rowTax = Number((cgstAmount + sgstAmount + igstAmount).toFixed(2));
    const rowTotal = Number((taxable + rowTax).toFixed(2));

    return {
      ...row,
      taxable,
      cgstRate,
      cgstAmount,
      sgstRate,
      sgstAmount,
      igstRate,
      igstAmount,
      rowTax,
      rowTotal
    };
  });

  // Calculate totals
  const subtotal = Number(computedRows.reduce((sum, r) => sum + r.taxable, 0).toFixed(2));
  const totalCgst = Number(computedRows.reduce((sum, r) => sum + r.cgstAmount, 0).toFixed(2));
  const totalSgst = Number(computedRows.reduce((sum, r) => sum + r.sgstAmount, 0).toFixed(2));
  const totalIgst = Number(computedRows.reduce((sum, r) => sum + r.igstAmount, 0).toFixed(2));
  const totalTax = Number((totalCgst + totalSgst + totalIgst).toFixed(2));
  const grandTotal = Number((subtotal + totalTax).toFixed(2));

  // Item row operations
  const handleItemSelect = (index, catalogItemId) => {
    const found = catalogItems.find((ci) => String(ci.id) === String(catalogItemId));
    if (!found) {
      const newItems = [...items];
      newItems[index] = {
        ...newItems[index],
        itemId: '',
        itemName: '',
        hsnSac: '',
        pricePerUnit: 0
      };
      setItems(newItems);
      return;
    }

    // Check if this item is already selected in another row
    const duplicateRowIndex = items.findIndex(
      (it, idx) =>
        idx !== index &&
        (String(it.itemId) === String(found.id) ||
          (it.itemName && it.itemName.trim().toLowerCase() === found.name.trim().toLowerCase()))
    );

    if (duplicateRowIndex !== -1) {
      setError(
        `"${found.name}" is already selected on row ${duplicateRowIndex + 1}. Please increase its quantity instead of adding it again.`
      );
      return;
    }

    setError('');
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      itemId: found.id,
      itemName: found.name,
      hsnSac: found.hsnSac || '',
      unit: found.unit || 'Pcs',
      pricePerUnit: found.pricePerUnit,
      gstRate: found.gstRate
    };
    setItems(newItems);
  };

  const handleRowChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index][field] = value;
    setItems(newItems);
  };

  const addRow = () => {
    setItems([
      ...items,
      {
        id: Date.now(),
        itemId: '',
        itemName: '',
        hsnSac: '',
        qty: 1,
        unit: 'Pcs',
        pricePerUnit: 0,
        gstRate: 18
      }
    ]);
  };

  const removeRow = (index) => {
    if (items.length === 1) {
      alert('Invoice must contain at least one item');
      return;
    }
    const newItems = items.filter((_, idx) => idx !== index);
    setItems(newItems);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim()) {
      setError('Customer name is required');
      return;
    }

    // Validate rows
    for (let i = 0; i < items.length; i++) {
      if (!items[i].itemName.trim()) {
        setError(`Please enter or select an item name on line ${i + 1}`);
        return;
      }
      if (Number(items[i].qty) <= 0) {
        setError(`Quantity must be greater than 0 on line ${i + 1}`);
        return;
      }
    }

    // Prevent duplicate items across rows
    const seenNames = new Map();
    for (let i = 0; i < items.length; i++) {
      const clean = items[i].itemName.trim().toLowerCase();
      if (seenNames.has(clean)) {
        setError(`"${items[i].itemName}" is added more than once (lines ${seenNames.get(clean) + 1} and ${i + 1}). Please adjust the quantity instead of adding duplicate rows.`);
        return;
      }
      seenNames.set(clean, i);
    }

    try {
      setLoading(true);
      setError('');

      const payload = {
        invoiceNumber: nextInvoiceNumber,
        invoiceDate: toISODate(invoiceDate) || invoiceDate,
        dueDate: null,
        userId: selectedUserId || null,

        // Buyer (Bill to)
        customerName: customerName.trim(),
        customerState: effectiveCustomerState,
        customerCity,
        customerAddress,
        customerPhone,
        customerEmail,
        customerGstin,
        customerStateCode: getStateCode(effectiveCustomerState, customerGstin),

        // Consignee (Ship to)
        shippingName: (sameAsBillTo ? customerName : shippingName || customerName).trim(),
        shippingAddress: sameAsBillTo ? customerAddress : shippingAddress || customerAddress,
        shippingCity: sameAsBillTo ? customerCity : shippingCity || customerCity,
        shippingState: sameAsBillTo ? effectiveCustomerState : shippingState || effectiveCustomerState,
        shippingGstin: sameAsBillTo ? customerGstin : shippingGstin || customerGstin,
        shippingPhone: sameAsBillTo ? customerPhone : shippingPhone || customerPhone,
        shippingStateCode: getStateCode(
          sameAsBillTo ? effectiveCustomerState : shippingState || effectiveCustomerState,
          sameAsBillTo ? customerGstin : shippingGstin || customerGstin
        ),

        // Dispatch & Order Reference fields
        deliveryNote: deliveryNote.trim(),
        modeTermsOfPayment: modeTermsOfPayment.trim(),
        referenceNoDate: referenceNoDate.trim(),
        otherReferences: otherReferences.trim(),
        buyersOrderNo: buyersOrderNo.trim(),
        orderDate: toISODate(orderDate) || orderDate,
        dispatchDocNo: dispatchDocNo.trim(),
        deliveryNoteDate: toISODate(deliveryNoteDate) || deliveryNoteDate,
        dispatchedThrough: dispatchedThrough.trim(),
        destination: destination.trim(),
        termsOfDelivery: termsOfDelivery.trim(),

        status: 'PENDING',
        notes,
        items: computedRows.map((r) => ({
          itemId: r.itemId || null,
          itemName: r.itemName,
          hsnSac: r.hsnSac,
          qty: Number(r.qty),
          unit: r.unit,
          pricePerUnit: Number(r.pricePerUnit),
          gstRate: Number(r.gstRate)
        }))
      };

      const res = await invoiceService.create(payload);
      if (res.data.success) {
        if (customerName.trim() && customerPhone.trim()) {
          const cleanKey = customerName.trim().toLowerCase();
          const cleanDigits = customerPhone.replace(/\D/g, '').slice(-10);
          if (cleanDigits) {
            localStorage.setItem(`cust_phone_${cleanKey}`, cleanDigits);
            try {
              const dir = JSON.parse(localStorage.getItem('customer_phones_directory') || '{}');
              dir[cleanKey] = cleanDigits;
              localStorage.setItem('customer_phones_directory', JSON.stringify(dir));
            } catch (e) { }
          }
        }
        if (onInvoiceCreated) {
          onInvoiceCreated(res.data.data);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error generating invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)] space-y-3">
      {/* Sleek Compact Header */}
      <div className="bg-white px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-2 flex-shrink-0">
        <div className="flex items-center space-x-2 min-w-0 flex-1">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center space-x-1.5 px-2.5 sm:px-3 py-1.5 text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 rounded-lg shadow-xs transition-all cursor-pointer shrink-0"
            title="Back to invoices"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>

          <div className="hidden sm:flex w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 items-center justify-center shrink-0 border border-indigo-100/70">
            <FileText className="w-3.5 h-3.5" />
          </div>

          <div className="min-w-0 flex items-center space-x-2 truncate">
            <h1 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight truncate">Tax Invoice</h1>
            <span className="hidden sm:inline-block px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 text-[9px] font-bold uppercase tracking-wider border border-indigo-100 shrink-0">
              Dual-GST
            </span>
            <span className="text-slate-300 hidden md:inline">•</span>
            <span className="text-[11px] text-slate-500 font-medium truncate hidden md:inline">
              {companySetting?.companyName || 'Company'}
              {companySetting?.gstin ? ` (GSTIN: ${companySetting.gstin})` : ''}
            </span>
          </div>
        </div>

        <div className="flex items-center shrink-0">
          <div className="flex items-center space-x-1 font-mono text-[11px] sm:text-xs bg-slate-50 px-2 sm:px-2.5 py-1 rounded-lg text-slate-700 border border-slate-200">
            <span className="text-slate-400 font-sans text-[9px] sm:text-[10px] uppercase font-semibold">Inv No:</span>
            <span className="font-bold text-indigo-600">{nextInvoiceNumber || 'Auto'}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2 flex-shrink-0">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col min-h-0 space-y-3">
        {/* Main Customer & Billing/Shipping Details */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs flex-shrink-0 overflow-hidden">
          {/* Top Invoice Metadata Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Invoice Date:</span>
                <div className="w-32">
                  <DateInputDDMMYYYY
                    value={invoiceDate}
                    onChange={(newVal) => setInvoiceDate(newVal)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white shadow-2xs"
                  />
                </div>
              </div>

              <div className="hidden sm:flex items-center space-x-1.5">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 font-bold text-[10px] uppercase">
                  Pending (Unpaid)
                </span>
              </div>
            </div>

            {/* Toggle Dispatch & Order References Button */}
            <button
              type="button"
              onClick={() => setShowDispatchFields(!showDispatchFields)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${showDispatchFields || deliveryNote || buyersOrderNo || dispatchDocNo || dispatchedThrough
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                }`}
            >
              <Truck className="w-3.5 h-3.5" />
              <span>Dispatch & Order Details</span>
              {showDispatchFields ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* TWO PORTIONS: BUYER (BILL TO) & CONSIGNEE (SHIP TO) */}
          <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* PORTION 1: BUYER (BILL TO) */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <User className="w-4 h-4 text-indigo-600" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Buyer (Bill to)
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium">Customer Details</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                  Customer / Business Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomerName(val);
                    if (sameAsBillTo) setShippingName(val);
                    const cleanKey = val.trim().toLowerCase();
                    if (cleanKey && !customerPhone) {
                      const cached = localStorage.getItem(`cust_phone_${cleanKey}`);
                      if (cached) {
                        setCustomerPhone(cached);
                        if (sameAsBillTo) setShippingPhone(cached);
                      } else {
                        try {
                          const dir = JSON.parse(localStorage.getItem('customer_phones_directory') || '{}');
                          if (dir[cleanKey]) {
                            setCustomerPhone(dir[cleanKey]);
                            if (sameAsBillTo) setShippingPhone(dir[cleanKey]);
                          }
                        } catch (err) { }
                      }
                    }
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                  Mobile / WhatsApp Number
                </label>
                <input
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => {
                    const phone = e.target.value;
                    setCustomerPhone(phone);
                    if (sameAsBillTo) setShippingPhone(phone);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                  Billing State *
                </label>
                <select
                  value={customerState}
                  onChange={(e) => {
                    const st = e.target.value;
                    setCustomerState(st);
                    if (sameAsBillTo) setShippingState(st);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                >
                  <option value="">Select State</option>
                  {INDIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                  Billing Address
                </label>
                <input
                  type="text"
                  placeholder="Street, Area, Building..."
                  value={customerAddress}
                  onChange={(e) => {
                    setCustomerAddress(e.target.value);
                    if (sameAsBillTo) setShippingAddress(e.target.value);
                  }}
                  className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                />
              </div>
            </div>

            {/* PORTION 2: CONSIGNEE (SHIP TO) */}
            <div className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 space-y-2.5">
              <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                <div className="flex items-center space-x-1.5">
                  <MapPin className="w-4 h-4 text-emerald-600" />
                  <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                    Consignee (Ship to)
                  </span>
                </div>

                <label className="flex items-center space-x-1.5 cursor-pointer text-xs font-semibold text-slate-700 select-none">
                  <input
                    type="checkbox"
                    checked={sameAsBillTo}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setSameAsBillTo(checked);
                      if (checked) {
                        setShippingName(customerName);
                        setShippingAddress(customerAddress);
                        setShippingCity(customerCity);
                        setShippingState(customerState);
                        setShippingGstin(customerGstin);
                        setShippingPhone(customerPhone);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 cursor-pointer"
                  />
                  <span className="text-[11px]">Same as Bill to</span>
                </label>
              </div>

              {sameAsBillTo ? (
                <div className="h-full flex flex-col justify-center items-center py-6 px-4 text-center rounded-lg border border-dashed border-slate-200 bg-white/60">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-1.5">
                    <Check className="w-4 h-4" />
                  </div>
                  <p className="text-xs font-bold text-slate-700">Same as Buyer (Bill to)</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {customerName || 'Customer'}
                    {customerPhone ? ` • 📞 ${customerPhone}` : ''}
                    {customerState ? ` (${customerState})` : ''}
                  </p>
                  <p className="text-[10px] text-indigo-600 font-medium mt-1">
                    Uncheck "Same as Bill to" above if shipping to a different client or address.
                  </p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-1">
                      Consignee / Recipient Name
                    </label>
                    <input
                      type="text"

                      value={shippingName}
                      onChange={(e) => setShippingName(e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Shipping Mobile Number
                    </label>
                    <input
                      type="tel"

                      value={shippingPhone}
                      onChange={(e) => setShippingPhone(e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Shipping State
                    </label>
                    <select
                      value={shippingState}
                      onChange={(e) => setShippingState(e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    >
                      <option value="">Select State</option>
                      {INDIAN_STATES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                      Shipping Address
                    </label>
                    <input
                      type="text"

                      value={shippingAddress}
                      onChange={(e) => setShippingAddress(e.target.value)}
                      className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* DISPATCH & ORDER REFERENCE DETAILS (ACCORDION / EXPANDABLE) */}
          {showDispatchFields && (
            <div className="px-4 pb-4 pt-1 border-t border-slate-200 bg-indigo-50/20">
              <div className="flex items-center space-x-1.5 mb-2.5">
                <Truck className="w-3.5 h-3.5 text-indigo-600" />
                <span className="font-bold text-xs uppercase tracking-wider text-slate-800">
                  Dispatch, Transport & Order References (Tax Invoice Right Grid)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Delivery Note
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. DN-102"
                    value={deliveryNote}
                    onChange={(e) => setDeliveryNote(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Mode / Terms of Payment
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Immediate / Net 30"
                    value={modeTermsOfPayment}
                    onChange={(e) => setModeTermsOfPayment(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Reference No. & Date
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. REF-2026/09"
                    value={referenceNoDate}
                    onChange={(e) => setReferenceNoDate(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Other References
                  </label>
                  <input
                    type="text"
                    placeholder="Other References"
                    value={otherReferences}
                    onChange={(e) => setOtherReferences(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Buyer's Order No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO-889"
                    value={buyersOrderNo}
                    onChange={(e) => setBuyersOrderNo(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Order Date (Dated)
                  </label>
                  <DateInputDDMMYYYY
                    value={orderDate}
                    onChange={(newVal) => setOrderDate(newVal)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Dispatch Doc No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. LR No / Challan No"
                    value={dispatchDocNo}
                    onChange={(e) => setDispatchDocNo(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Delivery Note Date
                  </label>
                  <DateInputDDMMYYYY
                    value={deliveryNoteDate}
                    onChange={(newVal) => setDeliveryNoteDate(newVal)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Dispatched Through
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. By Road / VRL / Hand"
                    value={dispatchedThrough}
                    onChange={(e) => setDispatchedThrough(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Destination
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Delhi / Lucknow / Mumbai"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-600 uppercase tracking-wider mb-0.5">
                    Terms of Delivery
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Door Delivery / Freight to Pay"
                    value={termsOfDelivery}
                    onChange={(e) => setTermsOfDelivery(e.target.value)}
                    className="w-full h-8 px-2.5 border border-slate-200 rounded-lg text-xs bg-white focus:ring-2 focus:ring-indigo-500 focus:outline-none shadow-2xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Dynamic Items Table that flexes to fill available height */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex-1 flex flex-col min-h-[280px]">
          <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center space-x-2">
              <span className="font-bold text-slate-800 text-xs uppercase tracking-wide">Items & Tax Details</span>
              <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white text-indigo-700 border border-indigo-200">
                {items.length} {items.length === 1 ? 'item' : 'items'}
              </span>
            </div>

            <button
              type="button"
              onClick={addRow}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          <div className="flex-1 overflow-x-auto overflow-y-auto min-h-0">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100/90 text-slate-600 font-semibold text-[11px] border-b border-slate-200 uppercase tracking-wider sticky top-0 z-10 backdrop-blur-xs">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[200px]">Item Description</th>
                  <th className="py-2.5 px-2 w-24">HSN/SAC</th>
                  <th className="py-2.5 px-2 w-16 text-center">Qty</th>
                  <th className="py-2.5 px-2 w-20 text-center">Unit</th>
                  <th className="py-2.5 px-2 w-24 text-right">Price/Unit (₹)</th>
                  <th className="py-2.5 px-2 w-24 text-right">Taxable (₹)</th>
                  <th className="py-2.5 px-2 w-20 text-center">GST %</th>
                  <th className="py-2.5 px-3 w-28 text-right font-bold">Total (₹)</th>
                  <th className="py-2.5 px-2 w-10 text-center">Del</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {computedRows.map((row, index) => (
                  <tr key={row.id || index} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-2 px-3 text-slate-400 font-mono text-[11px]">{index + 1}</td>

                    {/* Single Searchable Item Selector */}
                    <td className="py-2 px-2">
                      <SearchableItemSelect
                        row={row}
                        index={index}
                        allItems={items}
                        catalogItems={catalogItems}
                        onSelectItem={handleItemSelect}
                        onChangeName={(idx, val) => handleRowChange(idx, 'itemName', val)}
                      />
                    </td>

                    {/* HSN/SAC */}
                    <td className="py-2 px-2">
                      <input
                        type="text"
                        placeholder="HSN"
                        value={row.hsnSac}
                        onChange={(e) => handleRowChange(index, 'hsnSac', e.target.value)}
                        className="w-full h-9 px-2 text-xs border border-slate-200 rounded-lg font-mono focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-2 px-2 text-center">
                      <input
                        type="number"
                        min="1"
                        step="any"
                        required
                        value={row.qty}
                        onChange={(e) => handleRowChange(index, 'qty', e.target.value)}
                        className="w-full h-9 px-1.5 text-xs border border-slate-200 rounded-lg text-center font-bold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center justify-center min-w-[50px] h-8 px-2 text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-200 rounded-lg">
                        {row.unit || 'Pcs'}
                      </span>
                    </td>

                    {/* Price/Unit */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={row.pricePerUnit}
                        onChange={(e) => handleRowChange(index, 'pricePerUnit', e.target.value)}
                        className="w-full h-9 px-2.5 text-xs border border-slate-200 rounded-lg text-right font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Taxable */}
                    <td className="py-2 px-2 text-right font-mono text-xs font-semibold text-slate-800">
                      ₹{row.taxable.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* GST Rate */}
                    <td className="py-2 px-2 text-center">
                      <span className="inline-flex items-center justify-center min-w-[50px] h-8 px-2 text-xs font-bold text-indigo-700 bg-indigo-50/80 border border-indigo-100 rounded-lg font-mono">
                        {row.gstRate ?? 18}%
                      </span>
                    </td>

                    {/* Row Total */}
                    <td className="py-2 px-3 text-right font-mono text-xs font-bold text-slate-900">
                      ₹{row.rowTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Delete */}
                    <td className="py-2 px-2 text-center">
                      <button
                        type="button"
                        onClick={() => removeRow(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Remove line"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Bottom Section: Notes + Live Totals + Action Buttons in 1 Sleek Card */}
        <div className="bg-white px-5 py-3 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4 flex-shrink-0">
          {/* Notes inline input */}
          <div className="w-full md:w-5/12 flex items-center gap-2.5">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Notes:</span>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Terms, payment conditions, or notes to buyer..."
              className="w-full h-9 px-3 border border-slate-200 rounded-lg text-xs text-slate-700 focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Totals & Submit */}
          <div className="w-full md:w-7/12 flex items-center justify-end flex-wrap gap-3">
            {/* Subtotal */}
            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">Subtotal</span>
              <span className="font-mono text-xs font-semibold text-slate-700">₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
            </div>

            <div className="h-7 w-px bg-slate-200 hidden sm:block"></div>

            {/* GST details */}
            <div className="text-right">
              <span className="text-[9px] text-slate-400 uppercase tracking-wider block font-semibold">
                {isSameState ? `CGST (${totalCgst}) + SGST (${totalSgst})` : `IGST (${totalIgst})`}
              </span>
              <span className="font-mono text-xs font-bold text-indigo-600">
                ₹{totalTax.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Grand Total */}
            <div className="text-right px-4 py-2 bg-indigo-50/90 border border-indigo-200 rounded-xl shadow-2xs">
              <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block">Grand Total</span>
              <span className="font-mono text-lg font-black text-indigo-700 leading-none">
                ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center space-x-2 pl-2">
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex items-center space-x-1.5 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-100 transition-all disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{loading ? 'Submiting...' : 'Submit'}</span>
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
