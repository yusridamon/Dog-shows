import React from 'react';

export default function RulesPage() {
  return (
    <div>
      <h1>Show Rules & Requirements</h1>
      <div className="card">
        <h3>Entering a dog</h3>
        <ul>
          <li>Every dog must have a valid registration number.</li>
          <li>If your dog is in our registry, its details are retrieved automatically for you to confirm.</li>
          <li>If your dog is not found, you may enter it manually and must upload a pedigree / registration document (PDF, JPG, JPEG or PNG).</li>
          <li>Manually entered dogs are marked <strong>Pending Approval</strong> and only appear in the catalogue once an official approves them.</li>
        </ul>
      </div>
      <div className="card">
        <h3>Classes</h3>
        <p>
          Classes are determined automatically from the dog's date of birth and sex, calculated
          against the show date. Age ranges are set by show officials and can differ between shows.
        </p>
      </div>
      <div className="card">
        <h3>Grading & critiques</h3>
        <p>
          Grades and judge critiques are recorded per show. The same dog may receive different
          grades at different shows. Critiques are published once reviewed.
        </p>
      </div>
    </div>
  );
}
