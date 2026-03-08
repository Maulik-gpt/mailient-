import { Star } from "lucide-react";

// Simple skeleton loader component
const EmailSkeleton = () => (
  <div className="animate-pulse">
    <div className="flex items-start gap-3">
      <div className="w-4 h-4 bg-gray-300 rounded-full mt-1"></div>
      <div className="flex-1 space-y-3">
        <div className="flex items-center gap-2">
          <div className="h-4 bg-gray-300 rounded w-32"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="h-4 bg-gray-300 rounded w-16"></div>
        </div>
        <div className="h-3 bg-gray-300 rounded w-48"></div>
        <div className="h-4 bg-gray-300 rounded w-3/4"></div>
        <div className="space-y-2">
          <div className="h-3 bg-gray-300 rounded w-full"></div>
          <div className="h-3 bg-gray-300 rounded w-5/6"></div>
        </div>
        <div className="flex justify-between">
          <div className="h-3 bg-gray-300 rounded w-48"></div>
          <div className="h-3 bg-gray-300 rounded w-16"></div>
        </div>
      </div>
    </div>
  </div>
);

// HTML entity decoder for professional text rendering
const decodeHtmlEntities = (text) => {
  if (!text) return text;

  const entityMap = {
    '\u0027': "'",
    '&#x27;': "'",
    '&#34;': '"',
    '"': '"',
    '&#8220;': '"',
    '&#8221;': '"',
    '&ldquo;': '"',
    '&rdquo;': '"',
    '&#8216;': "'",
    '&#8217;': "'",
    '&lsquo;': "'",
    '&rsquo;': "'",
    '&#8230;': '…',
    '&hellip;': '…',
    '&#8212;': '—',
    '&mdash;': '—',
    '&#8211;': '–',
    '&ndash;': '–',
    '&': '&',
    '<': '<',
    '>': '>',
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&copy;': '©',
    '&reg;': '®',
    '&trade;': '™'
  };

  let decodedText = text;

  // Replace all HTML entities
  Object.entries(entityMap).forEach(([entity, replacement]) => {
    decodedText = decodedText.replace(new RegExp(entity, 'g'), replacement);
  });

  return decodedText;
};

const getBadgeColor = (badge) => {
  switch (badge) {
    case "Investor": return "bg-gray-600";
    case "Customer": return "bg-gray-500";
    case "Team": return "bg-gray-700";
    default: return "bg-gray-600";
  }
};

export default function EmailList({ emails, selectedEmails, onEmailSelect, onEmailClick, onStarToggle, onArchive, onDelete, isLoading }) {
    // Debug logging
    console.log('=== EMAIL LIST COMPONENT DEBUG ===');
    console.log('EmailList props:', {
      emailsLength: emails?.length || 0,
      selectedEmailsLength: selectedEmails?.length || 0,
      isLoading,
      emailsSample: emails?.slice(0, 2) || []
    });

    if (emails && emails.length > 0) {
      console.log('First email in list:', emails[0]);
      console.log('Email keys:', Object.keys(emails[0]));
    }

    // Show skeletons while loading
    if (isLoading) {
      return (
        <div className="space-y-2" style={{ backgroundColor: '#1a1a1a' }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="p-4">
              <EmailSkeleton />
            </div>
          ))}
        </div>
      );
    }

   if (!emails || emails.length === 0) {
       console.log('=== EMAIL LIST EMPTY STATE DEBUG ===');
       console.log('Empty state triggered:', {
         emailsIsNull: emails === null,
         emailsLength: emails?.length || 0,
         isLoading: isLoading
       });
       console.log('=== END EMPTY STATE DEBUG ===');

       return (
         <div className="h-full flex flex-col items-center justify-center text-center p-8" style={{ backgroundColor: '#1a1a1a' }}>
           <div className="h-20 w-20 rounded-full flex items-center justify-center mb-8" style={{ backgroundColor: '#2a2a2a' }}>
             <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
             </svg>
           </div>
           <h3 className="text-2xl font-semibold text-white mb-3">No emails found</h3>
           <p className="text-gray-400 text-base max-w-md leading-relaxed">Your inbox is empty. Connect your Gmail account to start viewing emails.</p>
         </div>
     );
   }

   return (
     <div className="space-y-2" style={{ backgroundColor: '#1a1a1a' }}>
       {emails.map((email, index) => (
         <div
           key={email.id}
           className="group relative cursor-pointer transition-all duration-200 p-4 border-b hover:shadow-lg rounded-lg"
           style={{ 
             backgroundColor: '#2a2a2a',
             borderColor: '#3a3a3a'
           }}
           onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#333333'}
           onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#2a2a2a'}
           onClick={() => onEmailClick(email)}
         >
           <div className="flex items-start gap-3">
             {/* Star Icon */}
             <button
               onClick={(e) => {
                 e.stopPropagation();
                 onStarToggle(email.id);
               }}
               className="flex-shrink-0 mt-1 p-1 rounded-full transition-all duration-200"
               style={{ backgroundColor: 'transparent' }}
               onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a3a3a'}
               onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
             >
               <Star
                 className={`h-4 w-4 transition-all duration-200 ${
                   email.isStarred
                     ? "fill-yellow-400 text-yellow-400"
                     : "text-gray-400 hover:text-gray-300"
                 }`}
               />
             </button>

             <div className="min-w-0 flex-1">
               {/* Sender Info and Badge */}
               <div className="flex items-center gap-2 mb-1">
                 <span className="font-semibold text-gray-100 text-sm">{email.sender}</span>
                 <div className={`w-2 h-2 rounded-full ${getBadgeColor(email.badge)}`} />
                 <span className="text-xs text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full">
                   {email.badge}
                 </span>
               </div>

               {/* Email Address */}
               <div className="text-xs text-gray-500 mb-2">{email.email}</div>

               {/* Subject */}
               <h3 className="text-base leading-snug text-white font-medium mb-1 group-hover:text-gray-100 transition-colors duration-200">
                 {email.subject}
               </h3>

               {/* Preview */}
               {email.snippet && (
                 <p className="text-sm leading-relaxed text-gray-400 group-hover:text-gray-300 transition-colors duration-200 line-clamp-2 mb-3">
                   {decodeHtmlEntities(email.snippet)}...
                 </p>
               )}

               {/* Metadata Row */}
               <div className="flex items-center justify-between text-xs text-gray-500">
                 <div className="flex items-center gap-4">
                   <span className="flex items-center gap-1">
                     <span className="text-gray-400 font-medium">↗</span>
                     <span>Relationship: {email.relationshipScore}%</span>
                   </span>
                   <span className="flex items-center gap-1">
                     <span className="text-gray-500">⏱</span>
                     <span>Last: {email.lastContact}</span>
                   </span>
                   <span className="flex items-center gap-1">
                     <span className="text-gray-500">✉</span>
                     <span>{email.emailCount} emails</span>
                   </span>
                 </div>
                 <span className="text-gray-500">{email.time}</span>
               </div>
             </div>
           </div>
         </div>
       ))}
     </div>
   );
 }