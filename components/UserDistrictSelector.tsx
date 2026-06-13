import React, { useState, useEffect } from 'react';

const USER_DISTRICT_KEY = 'crimepredict_user_district';

const DISTRICTS = [
  "Bagerhat", "Bandarban", "Barguna", "Barishal", "Bhola", "Bogura", "Brahmanbaria", "Chandpur", 
  "Chapainawabganj", "Chattogram", "Chuadanga", "Cox's Bazar", "Cumilla", "Dhaka", "Dinajpur", 
  "Faridpur", "Feni", "Gaibandha", "Gazipur", "Gopalganj", "Habiganj", "Jamalpur", "Jashore", 
  "Jhalokati", "Jhenaidah", "Joypurhat", "Khagrachhari", "Khulna", "Kishoreganj", "Kurigram", 
  "Kushtia", "Lakshmipur", "Lalmonirhat", "Madaripur", "Magura", "Manikganj", "Meherpur", 
  "Moulvibazar", "Munshiganj", "Mymensingh", "Naogaon", "Narail", "Narayanganj", "Narsingdi", 
  "Natore", "Netrokona", "Nilphamari", "Noakhali", "Pabna", "Panchagarh", "Patuakhali", "Pirojpur", 
  "Rajbari", "Rajshahi", "Rangamati", "Rangpur", "Satkhira", "Shariatpur", "Sherpur", "Sirajganj", 
  "Sunamganj", "Sylhet", "Tangail", "Thakurgaon"
];

interface UserDistrictSelectorProps {
  onDistrictSelect?: (district: string) => void;
}

export const UserDistrictSelector: React.FC<UserDistrictSelectorProps> = ({ onDistrictSelect }) => {
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const savedDistrict = localStorage.getItem(USER_DISTRICT_KEY);
    if (savedDistrict) {
      setSelectedDistrict(savedDistrict);
    }
  }, []);

  const handleSelectDistrict = (district: string) => {
    setSelectedDistrict(district);
    localStorage.setItem(USER_DISTRICT_KEY, district);
    setIsOpen(false);
    onDistrictSelect?.(district);
  };

  const handleClear = () => {
    setSelectedDistrict('');
    localStorage.removeItem(USER_DISTRICT_KEY);
    onDistrictSelect?.('');
  };

  return (
    <div className="position-relative">
      <div className="input-group shadow-sm rounded-3 overflow-hidden">
        <span className="input-group-text bg-info text-white">
          <i className="fas fa-map-marker-alt"></i>
        </span>
        <button
          className="btn btn-light text-start w-100 border-0"
          onClick={() => setIsOpen(!isOpen)}
          type="button"
        >
          {selectedDistrict || 'Select Your District...'}
        </button>
        {selectedDistrict && (
          <button
            className="btn btn-light border-0"
            onClick={handleClear}
            type="button"
            title="Clear selection"
          >
            <i className="fas fa-times text-danger"></i>
          </button>
        )}
      </div>

      {isOpen && (
        <div
          className="position-absolute top-100 start-0 w-100 bg-white border rounded-3 shadow-lg p-2 mt-2"
          style={{ zIndex: 1000, maxHeight: '300px', overflowY: 'auto' }}
        >
          {DISTRICTS.map((district) => (
            <button
              key={district}
              className={`d-block w-100 text-start px-3 py-2 border-0 rounded-2 mb-1 ${
                selectedDistrict === district
                  ? 'bg-info text-white fw-bold'
                  : 'bg-light text-dark hover'
              }`}
              onClick={() => handleSelectDistrict(district)}
              style={{ cursor: 'pointer' }}
            >
              {district}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export const getUserDistrict = (): string | null => {
  return localStorage.getItem(USER_DISTRICT_KEY);
};

export default UserDistrictSelector;
