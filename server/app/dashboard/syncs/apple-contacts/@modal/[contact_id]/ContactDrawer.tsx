"use client"

import { ContactAvatar } from "@/ui/ContactAvatar"
import { Decrypted } from "@/ui/Decrypted"
import { DemoBlur } from "@/ui/DemoBlur"
import { Drawer } from "@/ui/Drawer"
import { InfoRow } from "@/ui/InfoRow"
import { RawJson } from "@/ui/RawJson"
import { PhoneIcon, MailIcon } from "@/ui/icons"
import { type ContactDetail } from "../../actions"

type Props = {
  contact: ContactDetail
}

export function ContactDrawer({ contact }: Props) {
  return (
    <Drawer title="Contact Details">
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <ContactAvatar id={contact.id} size="lg" />
          <div className="min-w-0">
            <p className="text-lg font-semibold text-contrast">
              <DemoBlur>
                <Decrypted>{contact.firstName}</Decrypted>
                {contact.lastName && (
                  <>
                    {" "}
                    <Decrypted>{contact.lastName}</Decrypted>
                  </>
                )}
              </DemoBlur>
            </p>
            {contact.organization && (
              <p className="text-sm text-secondary">
                <Decrypted>{contact.organization}</Decrypted>
              </p>
            )}
          </div>
        </div>

        {contact.phoneNumbers.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Phone Numbers
            </label>
            <div className="space-y-2">
              {contact.phoneNumbers.map((phone, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <PhoneIcon size={16} className="shrink-0 text-secondary" />
                  <span className="text-sm text-contrast">
                    <DemoBlur>
                      <Decrypted>{phone}</Decrypted>
                    </DemoBlur>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {contact.emails.length > 0 && (
          <div>
            <label className="mb-2 block text-sm font-medium text-secondary">
              Emails
            </label>
            <div className="space-y-2">
              {contact.emails.map((email, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <MailIcon size={16} className="shrink-0 text-secondary" />
                  <span className="text-sm text-contrast">
                    <Decrypted>{email}</Decrypted>
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4 border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <InfoRow label="Contact ID" value={contact.contactId} copyable />
          <InfoRow label="Device" value={contact.deviceId} copyable />
          <InfoRow
            label="Last Synced"
            value={new Date(contact.syncTime).toLocaleString()}
          />
          <InfoRow
            label="Created"
            value={new Date(contact.createdAt).toLocaleString()}
          />
          <InfoRow
            label="Updated"
            value={new Date(contact.updatedAt).toLocaleString()}
          />
        </div>
      </div>
      <RawJson data={contact} />
    </Drawer>
  )
}

