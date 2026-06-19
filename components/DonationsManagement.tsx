"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import toast from "react-hot-toast";
import { Heart, Search } from "lucide-react";

type Donation = {
  id: string;
  created_at: string;
  amount: number;
  donor_name: string;
  donor_email: string;
  wants_receipt: boolean;
};

export default function DonationsManagement() {
  const [donations, setDonations] = useState<Donation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchDonations();
  }, []);

  async function fetchDonations() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/donations");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch donations");
      setDonations(data);
    } catch (err: any) {
      toast.error(err.message || "Failed to load donations");
    } finally {
      setLoading(false);
    }
  }

  const filteredDonations = donations.filter((d) =>
    d.donor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.donor_email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalDonations = filteredDonations.reduce((sum, d) => sum + Number(d.amount), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-pink-100 text-pink-600 rounded-full">
            <Heart className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold">Total Raised</h2>
            <p className="text-sm text-zinc-500">From {filteredDonations.length} generous donors</p>
          </div>
        </div>
        <div className="text-3xl font-bold text-pink-600">
          ${totalDonations.toFixed(2)}
        </div>
      </div>

      {/* Search & Actions */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-zinc-50 p-4 rounded-xl border">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search by name or email..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm outline-none focus:ring-2 focus:ring-pink-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button
          onClick={fetchDonations}
          className="px-4 py-2 text-sm bg-white border shadow-sm rounded-lg hover:bg-zinc-50 transition"
        >
          Refresh Data
        </button>
      </div>

      {/* Table */}
      <div className="border rounded-xl bg-white overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-50 border-b text-zinc-500">
              <tr>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Donor Name</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium text-center">Receipt Requested</th>
              </tr>
            </thead>
            <tbody className="divide-y text-zinc-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    Loading donations...
                  </td>
                </tr>
              ) : filteredDonations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">
                    No donations found matching your search.
                  </td>
                </tr>
              ) : (
                filteredDonations.map((donation) => (
                  <tr key={donation.id} className="hover:bg-zinc-50 transition">
                    <td className="px-6 py-4 whitespace-nowrap">
                      {format(new Date(donation.created_at), "MMM d, yyyy h:mm a")}
                    </td>
                    <td className="px-6 py-4 font-medium">{donation.donor_name}</td>
                    <td className="px-6 py-4">{donation.donor_email || "-"}</td>
                    <td className="px-6 py-4 text-pink-600 font-semibold">
                      ${Number(donation.amount).toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {donation.wants_receipt ? (
                        <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-md text-xs font-medium">
                          Yes
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-zinc-100 text-zinc-600 rounded-md text-xs">
                          No
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
